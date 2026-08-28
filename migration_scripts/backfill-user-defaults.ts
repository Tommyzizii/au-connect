import "dotenv/config";

// script to update legacy user accounts field ( accountStatus )
import prisma from "../lib/prisma";
import { Prisma } from "../lib/generated/prisma";

const USER_COLLECTION = "User";

type CountCommandResult = {
  n?: number;
};

type UpdateCommandResult = {
  n?: number;
  nModified?: number;
};

type LegacyUser = {
  _id: string | { $oid: string };
};

type MongoCursorBatch = {
  cursor?: {
    firstBatch?: LegacyUser[];
  };
};

const REQUIRED_DEFAULTS = [
  { field: "accountStatus", value: "ACTIVE" },
  { field: "warningCount", value: 0 },
  { field: "accountVerificationStatus", value: "UNSUBMITTED" },
  { field: "phonePublic", value: false },
  { field: "emailPublic", value: true },
] as const;

function missingOrNull(field: string): Prisma.InputJsonObject {
  return {
    $or: [{ [field]: { $exists: false } }, { [field]: null }],
  } as Prisma.InputJsonObject;
}

function objectIdToString(id: LegacyUser["_id"]) {
  return typeof id === "string" ? id : id.$oid;
}

async function countUsers(query: Prisma.InputJsonObject) {
  const result = (await prisma.$runCommandRaw({
    count: USER_COLLECTION,
    query,
  })) as CountCommandResult;

  return result.n ?? 0;
}

async function backfillRequiredDefault(
  field: string,
  value: string | number | boolean,
) {
  const query = missingOrNull(field);
  const before = await countUsers(query);

  if (before === 0) {
    console.info(`${field}: no User documents require a backfill.`);
    return;
  }

  const result = (await prisma.$runCommandRaw({
    update: USER_COLLECTION,
    updates: [
      {
        q: query,
        u: { $set: { [field]: value } } as Prisma.InputJsonObject,
        multi: true,
      },
    ],
  })) as UpdateCommandResult;

  const after = await countUsers(query);
  console.info(
    `${field}: updated ${result.nModified ?? 0} of ${result.n ?? before} matched User documents; ${after} remain.`,
  );
}

async function findUsersMissingConnectionCount() {
  const result = (await prisma.$runCommandRaw({
    find: USER_COLLECTION,
    filter: missingOrNull("connections"),
    projection: { _id: 1 },
  })) as MongoCursorBatch;

  return result.cursor?.firstBatch ?? [];
}

async function backfillConnectionCounts() {
  const users = await findUsersMissingConnectionCount();

  if (users.length === 0) {
    console.info("connections: no User documents require a backfill.");
    return;
  }

  let updated = 0;
  for (const user of users) {
    const userId = objectIdToString(user._id);
    const connectionCount = await prisma.connection.count({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { connections: connectionCount },
      select: { id: true },
    });
    updated += 1;
  }

  console.info(
    `connections: recalculated the count for ${updated} User documents from Connection records.`,
  );
}

async function main() {
  for (const { field, value } of REQUIRED_DEFAULTS) {
    await backfillRequiredDefault(field, value);
  }

  await backfillConnectionCounts();
  console.info("User default backfill completed.");
}

main()
  .catch((error) => {
    console.error("Failed to backfill User defaults:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
