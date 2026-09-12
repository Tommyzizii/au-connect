import assert from "node:assert/strict";
import test from "node:test";
import { getShareRecipients } from "../lib/shareRecipients";

const connection = { id: "user-1", username: "Alex", title: "Student", profilePic: null };
const inboxRow = {
  conversationId: "conversation-1",
  peer: { type: "USER", id: "user-2", name: "Sam", subtitle: "Alumni", profilePic: "sam.jpg" },
};

test("combines connections with the inbox peer response and deduplicates users", () => {
  assert.deepEqual(getShareRecipients([connection], [inboxRow, inboxRow]), [
    connection,
    { id: "user-2", username: "Sam", title: "Alumni", profilePic: "sam.jpg" },
  ]);
  assert.equal(getShareRecipients([connection], [{ peer: { ...inboxRow.peer, id: connection.id } }]).length, 1);
});

test("skips community peers and malformed entries without losing valid connections", () => {
  assert.deepEqual(getShareRecipients([null, connection, {}], [
    null, {}, { peer: null },
    { peer: { ...inboxRow.peer, type: "COMMUNITY" } },
    { peer: { type: "USER", name: "Missing ID" } },
  ]), [connection]);
});

test("handles empty or unavailable lists", () => {
  assert.deepEqual(getShareRecipients(undefined, undefined), []);
  assert.deepEqual(getShareRecipients([connection], {}), [connection]);
  assert.equal(getShareRecipients([], [inboxRow])[0].id, "user-2");
});
