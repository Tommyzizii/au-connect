import "dotenv/config";

// Seed LOCAL TEST data for AU Connect.
//
// Purpose: populate a local test database so the app looks like a real social
// network while scrolling (feed, connect, jobs, community, messaging).
//
// Constraints by design:
//   • writes ONLY to MongoDB - no Azure blob writes, all media fields null
//     (the UI renders initials avatars / DEFAULT_PROFILE_PIC fallbacks)
//   • all fake emails use @seed.aunetwork.test so the seed is identifiable
//   • re-runnable: deletes only its own previous data before re-creating
//   • refuses to run against anything that is not localhost (safety guard)
//
// Usage (Mongo must be reachable from this host, e.g. via the seed overlay):
//   DATABASE_URL="mongodb://localhost:27018/au-connect?directConnection=true" \
//     pnpm db:seed
import prisma from "../lib/prisma";
import { normalizeSkillName } from "../lib/skill-normalization";
import type {
  AccountVerificationRole,
  EmploymentType,
  JobLocationType,
  NotificationType,
  PostInteractionType,
  RequestStatus,
} from "../lib/generated/prisma";

// ── safety guard ────────────────────────────────────────────────────────────
const dbUrl = process.env.DATABASE_URL ?? "";
if (!/\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(dbUrl)) {
  console.error(
    "REFUSING TO RUN: DATABASE_URL does not point at localhost.\n" +
      "This seed is for local test databases only.\n" +
      `Current DATABASE_URL host: ${dbUrl.split("//")[1]?.split(/[/?]/)[0] ?? "(unset)"}`,
  );
  process.exit(1);
}

const SEED_DOMAIN = "@seed.aunetwork.test";

const daysAgo = (n: number, hourOffset = 0) =>
  new Date(Date.now() - n * 24 * 3600 * 1000 - hourOffset * 3600 * 1000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 3600 * 1000);

// ordered pair helper - mirrors lib/connect.ts (a < b)
const pair = (a: string, b: string) =>
  a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };

type SeedUser = {
  username: string;
  first: string;
  title: string;
  location: string;
  about: string;
  role?: AccountVerificationRole;
  degree: string;
  field: string;
  gradYear: number;
  job: { title: string; company: string; type: EmploymentType } | null;
};

const USERS: SeedUser[] = [
  { username: "Ploy Rattanakul", first: "Ploy", title: "Computer Science Student at Assumption University", location: "Bangkok, Thailand", about: "Third-year CS student. Interested in web development and UI design. Currently looking for a frontend internship.", role: "STUDENT", degree: "B.Sc.", field: "Computer Science", gradYear: 2027, job: { title: "Frontend Developer Intern", company: "Agoda", type: "INTERNSHIP" } },
  { username: "Nattapong Vongkulsiri", first: "Nattapong", title: "Software Engineering Student at Assumption University", location: "Bangkok, Thailand", about: "Backend enthusiast. Python, Go and databases. Building a food delivery side project.", role: "STUDENT", degree: "B.Sc.", field: "Software Engineering", gradYear: 2026, job: { title: "Backend Developer (Part-time)", company: "LINE Man", type: "PART_TIME" } },
  { username: "Kanyarat Suwannakit", first: "Kanyarat", title: "Data Science Student at Assumption University", location: "Bangkok, Thailand", about: "Love numbers and messy datasets. Pandas, scikit-learn, and a bit of everything.", role: "STUDENT", degree: "B.Sc.", field: "Data Science", gradYear: 2027, job: null },
  { username: "Somchai Phromma", first: "Somchai", title: "Lecturer, Martin de Tours School of Management", location: "Bangkok, Thailand", about: "Teaching business analytics and research methods. Office hours by appointment.", role: "LECTURER", degree: "Ph.D.", field: "Business Administration", gradYear: 2010, job: { title: "Lecturer", company: "Assumption University", type: "FULL_TIME" } },
  { username: "Aisha Rahman", first: "Aisha", title: "International Student - Business Administration", location: "Bangkok, Thailand", about: "From Dhaka. Exploring Bangkok one street food stall at a time. Marketing minor.", role: "STUDENT", degree: "B.B.A.", field: "Business Administration", gradYear: 2026, job: null },
  { username: "Daniel Weber", first: "Daniel", title: "Exchange Student - Computer Engineering", location: "Bangkok, Thailand", about: "One semester exchange from TU Munich. Robotics club member.", role: "STUDENT", degree: "B.Sc.", field: "Computer Engineering", gradYear: 2028, job: null },
  { username: "Chalermchai Wongwasin", first: "Chalermchai", title: "Full-Stack Developer at SCB Abacus", location: "Bangkok, Thailand", about: "AU alumni, class of 2022. Hiring juniors, ping me.", role: "ALUMNI", degree: "B.Sc.", field: "Software Engineering", gradYear: 2022, job: { title: "Full-Stack Developer", company: "SCB Abacus", type: "FULL_TIME" } },
  { username: "Pitchaya Ngamvilaisiri", first: "Pitchaya", title: "UX Designer at Opn", location: "Bangkok, Thailand", about: "Designing fintech products. Figma, user research, design systems.", role: "ALUMNI", degree: "B.A.", field: "Communication Arts", gradYear: 2021, job: { title: "UX Designer", company: "Opn", type: "FULL_TIME" } },
  { username: "Marcus Chen", first: "Marcus", title: "Business Analytics Student at Assumption University", location: "Nonthaburi, Thailand", about: "Numbers, dashboards, and campus badminton.", role: "STUDENT", degree: "B.B.A.", field: "Business Analytics", gradYear: 2027, job: null },
  { username: "Wipawan Laohapongchana", first: "Wipawan", title: "Marketing Student at Assumption University", location: "Samut Prakan, Thailand", about: "Content creation and event organizing. Community management intern.", role: "STUDENT", degree: "B.B.A.", field: "Marketing", gradYear: 2026, job: { title: "Marketing Intern", company: "Shopee", type: "INTERNSHIP" } },
  { username: "Anucha Thanomkul", first: "Anucha", title: "DevOps Engineer at True Digital", location: "Bangkok, Thailand", about: "AU alumni. Kubernetes, Terraform, coffee.", role: "ALUMNI", degree: "B.Sc.", field: "Information Technology", gradYear: 2020, job: { title: "DevOps Engineer", company: "True Digital Group", type: "FULL_TIME" } },
  { username: "Fatima Al-Zahra", first: "Fatima", title: "Biotechnology Student at Assumption University", location: "Bangkok, Thailand", about: "Lab work by day, science communication by night.", role: "STUDENT", degree: "B.Sc.", field: "Biotechnology", gradYear: 2027, job: null },
  { username: "Tanawat Chirathivat", first: "Tanawat", title: "Mobile Developer at KBTG", location: "Bangkok, Thailand", about: "Flutter and Kotlin. AU class of 2023.", role: "ALUMNI", degree: "B.Sc.", field: "Software Engineering", gradYear: 2023, job: { title: "Mobile Developer", company: "Kasikornbank Technology", type: "FULL_TIME" } },
  { username: "Elena Petrova", first: "Elena", title: "International Student - Tourism Management", location: "Bangkok, Thailand", about: "From Almaty. Travel, hospitality, and hotel operations.", role: "STUDENT", degree: "B.B.A.", field: "Tourism Management", gradYear: 2026, job: null },
  { username: "Rachen Suwannaphum", first: "Rachen", title: "Computer Science Student at Assumption University", location: "Bangkok, Thailand", about: "Competitive programming, chess, and Go (the language and the game).", role: "STUDENT", degree: "B.Sc.", field: "Computer Science", gradYear: 2028, job: null },
  { username: "Melissa Tan", first: "Melissa", title: "Finance Student at Assumption University", location: "Bangkok, Thailand", about: "From Singapore. CFA candidate. Spreadsheet enjoyer.", role: "STUDENT", degree: "B.B.A.", field: "Finance", gradYear: 2026, job: null },
  { username: "Kittipat Rungrueang", first: "Kittipat", title: "QA Engineer at Omise", location: "Bangkok, Thailand", about: "Breaking software on purpose since 2021. AU alumni.", role: "ALUMNI", degree: "B.Sc.", field: "Software Engineering", gradYear: 2021, job: { title: "QA Engineer", company: "Opn (Omise)", type: "FULL_TIME" } },
  { username: "Nadia Hassan", first: "Nadia", title: "Architecture Student at Assumption University", location: "Pathum Thani, Thailand", about: "Sketching buildings and building sketches.", role: "STUDENT", degree: "B.Arch.", field: "Architecture", gradYear: 2028, job: null },
  { username: "Phurit Boonchalee", first: "Phurit", title: "Lecturer, Department of Computer Science", location: "Bangkok, Thailand", about: "Researching distributed systems. Supervising senior projects.", role: "LECTURER", degree: "Ph.D.", field: "Computer Science", gradYear: 2014, job: { title: "Lecturer", company: "Assumption University", type: "FULL_TIME" } },
  { username: "Sasithorn Kaewkla", first: "Sasithorn", title: "HR Coordinator at Central Group", location: "Bangkok, Thailand", about: "AU alumni, class of 2019. Campus recruiter - happy to review resumes.", role: "ALUMNI", degree: "B.B.A.", field: "Human Resources", gradYear: 2019, job: { title: "HR Coordinator", company: "Central Group", type: "FULL_TIME" } },
  { username: "Yusuf Karim", first: "Yusuf", title: "Mechanical Engineering Student at Assumption University", location: "Bangkok, Thailand", about: "Formula student team. CAD and caffeine.", role: "STUDENT", degree: "B.Eng.", field: "Mechanical Engineering", gradYear: 2027, job: null },
  { username: "Kanokwan Srisuk", first: "Kanokwan", title: "Cybersecurity Student at Assumption University", location: "Bangkok, Thailand", about: "CTF player. Currently deep in binary exploitation.", role: "STUDENT", degree: "B.Sc.", field: "Cybersecurity", gradYear: 2027, job: null },
  { username: "Boris Novak", first: "Boris", title: "International Student - International Business", location: "Bangkok, Thailand", about: "From Prague. Trading, startups, and muay thai.", role: "STUDENT", degree: "B.B.A.", field: "International Business", gradYear: 2026, job: null },
  { username: "Arunee Phanphaiboon", first: "Arunee", title: "Product Manager at Ascend Money", location: "Bangkok, Thailand", about: "AU alumni. Building lending products. Always happy to chat product careers.", role: "ALUMNI", degree: "B.B.A.", field: "Business Administration", gradYear: 2018, job: { title: "Product Manager", company: "Ascend Money", type: "FULL_TIME" } },
];

type SeedPost = { author: number; daysBack: number; content: string; postType: "text" | "article"; title?: string };

const POSTS: SeedPost[] = [
  { author: 0, daysBack: 0, postType: "text", content: "Just finished my first React project after 3 weeks of debugging useState hooks 😅 Next stop: TypeScript. Anyone else learning frontend this semester?" },
  { author: 6, daysBack: 0, postType: "text", content: "We are hiring junior full-stack developers at SCB Abacus (Bangkok, hybrid). React + Node.js. New grads welcome - check the Jobs tab or DM me." },
  { author: 3, daysBack: 1, postType: "text", content: "Reminder for my Business Analytics students: the midterm covers chapters 1–6. Bring a calculator. No, your phone is not a calculator." },
  { author: 1, daysBack: 1, postType: "text", content: "Spent the weekend rewriting my food delivery app's API in Go. Latency dropped from 340ms to 45ms. Sometimes the hype is real." },
  { author: 2, daysBack: 2, postType: "text", content: "Cleaned a 2GB dataset of Bangkok restaurant inspections for my class project. 40% of rows had missing health inspection dates. Data cleaning is 80% of data science, confirmed." },
  { author: 8, daysBack: 2, postType: "text", content: "The badminton court at the Hua Mak campus gym is finally reopened after renovation. Who's in for Friday evening games?" },
  { author: 13, daysBack: 3, postType: "text", content: "Hotel internship interview at a 5-star property next week. Any tourism seniors have tips for the property tour round?" },
  { author: 10, daysBack: 3, postType: "text", content: "PSA from your friendly neighborhood DevOps person: learn Docker before your first job. Your future self will thank you when the onboarding repo actually runs on day one." },
  { author: 15, daysBack: 4, postType: "text", content: "Made a stock analysis dashboard comparing SET50 companies for my finance class. Open to feedback, especially on the DCF model assumptions." },
  { author: 19, daysBack: 4, postType: "text", content: "We are opening our management trainee program for 2026 graduates. Rotation across retail, property, and hospitality. Applications open next month." },
  { author: 4, daysBack: 5, postType: "text", content: "Volunteering at the international student orientation next week. If you are new to AU and lost, find the girl with the Dhaka flag pin." },
  { author: 22, daysBack: 5, postType: "text", content: "Won 3rd place in the national CTF qualifier with my team this weekend! Next round in Chiang Mai next month." },
  { author: 7, daysBack: 6, postType: "article", title: "What 4 years of fintech design taught me about trust", content: "Trust is the real currency in fintech design. Three things I learned shipping payment products at Opn:\n\n1. Show the money movement. Users need to see where their baht is at every step.\n2. Errors are conversations, not dead ends. A failed transfer is a scary moment; the UI should explain what happened and what happens next.\n3. Speed is a feature, but certainty beats speed. A 200ms slower confirmation screen with a clear receipt beats a fast ambiguous one." },
  { author: 12, daysBack: 6, postType: "text", content: "Hot take: cross-platform frameworks are fine for 90% of apps. Our Flutter app ships to 4 countries with a team of 3. Choose boring technology." },
  { author: 18, daysBack: 7, postType: "text", content: "Senior project supervision slots for next semester are open. Topics in distributed systems and performance engineering especially welcome. Office: Albert Laurence Building, 3rd floor." },
  { author: 14, daysBack: 7, postType: "text", content: "Is anyone else's timetable a nightmare this semester? Two labs back to back in buildings on opposite ends of campus. Doing cardio between classes." },
  { author: 23, daysBack: 8, postType: "article", title: "From AU classroom to product management: a 7-year path", content: "A lot of students ask me how to get into product management. My honest answer: there is no single path, but there is a single starting point - solve a real problem for real users.\n\nAt AU I ran the student club's event calendar. That taught me more about requirements, trade-offs, and stakeholder management than any textbook. PM is 30% craft, 70% communication." },
  { author: 16, daysBack: 8, postType: "text", content: "Testing tip from work: before you file a bug, reproduce it twice with different data. You would not believe how many 'bugs' are actually just stale cache." },
  { author: 5, daysBack: 9, postType: "text", content: "Robotics club is building a line-follower robot for the national contest. We need one more person comfortable with PID controllers. No experience needed, enthusiasm required." },
  { author: 21, daysBack: 9, postType: "text", content: "Formula student season starts again. This year's goal: finish the endurance race without the cooling system turning into a fountain." },
  { author: 9, daysBack: 10, postType: "text", content: "Organizing the campus sustainability fair next month. Looking for volunteers and student vendors. Over 20 clubs confirmed so far!" },
  { author: 17, daysBack: 11, postType: "text", content: "Studio update: my thesis project is a pavilion built entirely from reclaimed timber joints. Photos when the model stops collapsing." },
];

type SeedJob = {
  author: number;
  title: string;
  company: string;
  location: string;
  locationType: JobLocationType;
  employmentType: EmploymentType;
  salaryMin: number;
  salaryMax: number;
  details: string;
  skills: string[];
  daysBack: number;
};

const JOBS: SeedJob[] = [
  { author: 6, title: "Junior Full-Stack Developer", company: "SCB Abacus", location: "Bangkok, Thailand", locationType: "HYBRID", employmentType: "FULL_TIME", salaryMin: 2000, salaryMax: 2800, details: "Build and maintain internal lending platforms. React frontend, Node.js backend, MongoDB. Mentorship provided, real users from day one.", skills: ["React", "Node.js", "SQL", "Docker"], daysBack: 2 },
  { author: 10, title: "DevOps Intern", company: "True Digital Group", location: "Bangkok, Thailand", locationType: "ONSITE", employmentType: "INTERNSHIP", salaryMin: 800, salaryMax: 1000, details: "Support the platform team with CI/CD pipelines, Kubernetes clusters, and infrastructure automation. 3 days/week, minimum 4 months.", skills: ["Docker", "Go", "Python"], daysBack: 5 },
  { author: 12, title: "Flutter Developer (Junior)", company: "Kasikornbank Technology", location: "Bangkok, Thailand", locationType: "HYBRID", employmentType: "FULL_TIME", salaryMin: 1800, salaryMax: 2400, details: "Work on the K PLUS mobile app used by 10M+ users. Flutter, REST APIs, and a mature engineering culture.", skills: ["SQL", "Docker", "Python"], daysBack: 7 },
  { author: 7, title: "Product Design Intern", company: "Opn", location: "Bangkok, Thailand", locationType: "REMOTE", employmentType: "INTERNSHIP", salaryMin: 900, salaryMax: 1100, details: "Join the design team shaping payment experiences across Southeast Asia. Figma proficiency required, motion design is a plus.", skills: ["CSS", "React"], daysBack: 4 },
  { author: 19, title: "Management Trainee - Retail & Hospitality", company: "Central Group", location: "Bangkok, Thailand", locationType: "ONSITE", employmentType: "FULL_TIME", salaryMin: 1500, salaryMax: 2000, details: "12-month rotation program across retail operations, property, and hospitality business units. For 2026 graduates.", skills: ["SQL", "Python"], daysBack: 9 },
  { author: 23, title: "Associate Product Manager", company: "Ascend Money", location: "Bangkok, Thailand", locationType: "HYBRID", employmentType: "FULL_TIME", salaryMin: 2200, salaryMax: 3000, details: "Own a lending product surface end to end. Work with engineering, design, compliance, and 5M+ customers. 1-3 years experience preferred.", skills: ["SQL", "Python", "React"], daysBack: 11 },
];

const COMMUNITIES = [
  { name: "AU Computer Science Club", slug: "au-cs-club", about: "Official CS club: workshops, hackathons, and weekly coding sessions. All majors welcome.", location: "Bangkok, Thailand" },
  { name: "AU Robotics Society", slug: "au-robotics", about: "Building robots for national and international contests. Meets Thursdays at the engineering lab.", location: "Bangkok, Thailand" },
  { name: "AU Photography Club", slug: "au-photography", about: "Campus photographers of every level. Monthly photowalks and gear sharing.", location: "Bangkok, Thailand" },
  { name: "AU Debate Union", slug: "au-debate", about: "Competitive debating in English and Thai. Novice training every semester.", location: "Bangkok, Thailand" },
];

async function main() {
  // ── 0. find the real logged-in user (the account you actually use) ────────
  const me = await prisma.user.findFirst({
    where: { googleId: { not: null } },
    orderBy: { createdAt: "asc" },
  }) ?? await prisma.user.findFirst({
    where: { microsoftId: { not: null } },
    orderBy: { createdAt: "asc" },
  }) ?? await prisma.user.findFirst({
    where: { linkedinId: { not: null } },
    orderBy: { createdAt: "asc" },
  });

  if (!me) {
    console.error(
      "No real user found. Log into the app once (any OAuth provider) so your account exists, then re-run the seed.",
    );
    process.exit(1);
  }
  console.log(`Seeding around real user: ${me.username} (${me.email})`);

  // ── 1. purge previous seed data (only rows this script created) ──────────
  const oldSeeds = await prisma.user.findMany({
    where: { email: { endsWith: SEED_DOMAIN } },
    select: { id: true },
  });
  const oldIds = oldSeeds.map((u) => u.id);

  if (oldIds.length > 0) {
    const oldPosts = await prisma.post.findMany({
      where: { userId: { in: oldIds } },
      select: { id: true },
    });
    const oldPostIds = oldPosts.map((p) => p.id);
    await prisma.jobSkill.deleteMany({ where: { jobPost: { postId: { in: oldPostIds } } } });
    await prisma.jobApplication.deleteMany({ where: { jobPost: { postId: { in: oldPostIds } } } });
    await prisma.notification.deleteMany({ where: { fromUserId: { in: oldIds } } });
    await prisma.comment.deleteMany({ where: { userId: { in: oldIds } } });
    await prisma.postInteraction.deleteMany({ where: { userId: { in: oldIds } } });
    await prisma.message.deleteMany({
      where: { conversation: { OR: [{ userAId: { in: oldIds } }, { userBId: { in: oldIds } }] } },
    });
    await prisma.conversation.deleteMany({
      where: { OR: [{ userAId: { in: oldIds } }, { userBId: { in: oldIds } }] },
    });
    await prisma.post.deleteMany({ where: { userId: { in: oldIds } } });
    await prisma.connectionRequest.deleteMany({
      where: { OR: [{ fromUserId: { in: oldIds } }, { toUserId: { in: oldIds } }] },
    });
    await prisma.connection.deleteMany({
      where: { OR: [{ userAId: { in: oldIds } }, { userBId: { in: oldIds } }] },
    });
    await prisma.communityManager.deleteMany({ where: { userId: { in: oldIds } } });
    await prisma.communityFollow.deleteMany({ where: { userId: { in: oldIds } } });
    await prisma.community.deleteMany({ where: { slug: { in: COMMUNITIES.map((c) => c.slug) } } });
    await prisma.education.deleteMany({ where: { userId: { in: oldIds } } });
    await prisma.experience.deleteMany({ where: { userId: { in: oldIds } } });
    await prisma.notification.deleteMany({ where: { userId: me.id, fromUserId: { in: oldIds } } });
    await prisma.user.deleteMany({ where: { id: { in: oldIds } } });
    await prisma.user.update({ where: { id: me.id }, data: { connections: 0 } }).catch(() => {});
    console.log(`Removed ${oldIds.length} previous seed users and their data.`);
  }

  // ── 2. users + education + experience ────────────────────────────────────
  const created = [] as { id: string; username: string; first: string }[];
  for (let i = 0; i < USERS.length; i++) {
    const u = USERS[i];
    const user = await prisma.user.create({
      data: {
        username: u.username,
        email: `${u.first.toLowerCase().replace(/[^a-z]/g, "")}${i}${SEED_DOMAIN}`,
        title: u.title,
        location: u.location,
        about: u.about,
        accountVerificationStatus: u.role ? "APPROVED" : "UNSUBMITTED",
        accountVerificationRole: u.role ?? null,
        createdAt: daysAgo(400 - i * 10),
        education: {
          create: {
            school: "Assumption University",
            degree: u.degree,
            fieldOfStudy: u.field,
            startMonth: 6,
            startYear: u.gradYear - 4,
            endMonth: 3,
            endYear: u.gradYear,
          },
        },
        ...(u.job
          ? {
              experience: {
                create: {
                  title: u.job.title,
                  employmentType: u.job.type,
                  company: u.job.company,
                  startMonth: u.gradYear <= 2023 ? 6 : 1,
                  startYear: Math.max(u.gradYear, 2024),
                  isCurrent: true,
                },
              },
            }
          : {}),
      },
    });
    created.push({ id: user.id, username: user.username, first: u.first });
  }
  console.log(`Created ${created.length} seed users.`);

  // ── 3. connections (mesh among seeds + 8 linked to me) ──────────────────
  const myCircle = [0, 1, 2, 6, 7, 10, 19, 23]; // indexes into USERS
  const edges = new Set<string>();
  const addEdge = (a: string, b: string) => edges.add(a < b ? `${a}|${b}` : `${b}|${a}`);

  for (const idx of myCircle) addEdge(created[idx].id, me.id);
  // mesh: everyone is within 2 hops of most others
  for (let i = 0; i < created.length; i++) {
    addEdge(created[i].id, created[(i + 1) % created.length].id);
    addEdge(created[i].id, created[(i + 3) % created.length].id);
    addEdge(created[i].id, created[(i + 7) % created.length].id);
  }
  for (const key of edges) {
    const [a, b] = key.split("|");
    await prisma.connection.create({ data: pair(a, b) });
  }

  // update denormalized connection counts
  const degree = new Map<string, number>();
  for (const key of edges) {
    const [a, b] = key.split("|");
    degree.set(a, (degree.get(a) ?? 0) + 1);
    degree.set(b, (degree.get(b) ?? 0) + 1);
  }
  for (const [userId, count] of degree) {
    await prisma.user.update({ where: { id: userId }, data: { connections: count } });
  }
  console.log(`Created ${edges.size} connections.`);

  // ── 4. pending connection requests to me + notifications ─────────────────
  const requesters = [5, 13, 17, 20];
  const statuses: RequestStatus[] = ["PENDING"];
  const notifTypes: NotificationType[] = ["CONNECTION_REQUEST"];
  for (const idx of requesters) {
    const r = await prisma.connectionRequest.create({
      data: {
        fromUserId: created[idx].id,
        toUserId: me.id,
        status: statuses[0],
        createdAt: daysAgo(requesters.indexOf(idx)),
      },
    });
    await prisma.notification.create({
      data: {
        userId: me.id,
        fromUserId: created[idx].id,
        type: notifTypes[0],
        entityId: r.id,
        createdAt: daysAgo(requesters.indexOf(idx)),
        isRead: requesters.indexOf(idx) > 1,
      },
    });
  }
  console.log(`Created ${requesters.length} pending connection requests for you.`);

  // ── 5. communities + follows + one community post ────────────────────────
  const managerIdx = [0, 5, 17, 15]; // one manager per community
  const communityIds: string[] = [];
  for (let i = 0; i < COMMUNITIES.length; i++) {
    const c = await prisma.community.create({
      data: {
        name: COMMUNITIES[i].name,
        slug: COMMUNITIES[i].slug,
        about: COMMUNITIES[i].about,
        location: COMMUNITIES[i].location,
        createdAt: daysAgo(300 - i * 30),
        managers: { create: { userId: created[managerIdx[i]].id } },
      },
    });
    communityIds.push(c.id);
  }
  // everyone follows 1-3 communities; I follow the first two
  const followPairs = new Set<string>();
  for (let i = 0; i < created.length; i++) {
    followPairs.add(`${created[i].id}|${communityIds[i % communityIds.length]}`);
    followPairs.add(`${created[i].id}|${communityIds[(i + 2) % communityIds.length]}`);
  }
  followPairs.add(`${me.id}|${communityIds[0]}`);
  followPairs.add(`${me.id}|${communityIds[2]}`);
  for (const key of followPairs) {
    const [userId, communityId] = key.split("|");
    await prisma.communityFollow.create({ data: { userId, communityId } });
  }
  await prisma.post.create({
    data: {
      userId: created[0].id,
      username: created[0].username,
      actorType: "COMMUNITY",
      communityId: communityIds[0],
      postType: "text",
      title: "Hackathon 2026: registrations open",
      content: "48 hours, 4 themes, 100k THB in prizes. Team of 3-4. Registration closes in two weeks. Beginners track included - mentoring all weekend.",
      pollOptions: [],
      likeCount: 0,
      createdAt: daysAgo(1, 3),
    },
  });
  console.log(`Created ${COMMUNITIES.length} communities with follows and 1 community post.`);

  // ── 6. posts ──────────────────────────────────────────────────────────────
  const postIds: string[] = [];
  for (const p of POSTS) {
    const post = await prisma.post.create({
      data: {
        userId: created[p.author].id,
        username: created[p.author].username,
        postType: p.postType,
        title: p.title ?? null,
        content: p.content,
        pollOptions: [],
        createdAt: daysAgo(p.daysBack),
      },
    });
    postIds.push(post.id);
  }
  // a poll post
  const poll = await prisma.post.create({
    data: {
      userId: created[8].id,
      username: created[8].username,
      postType: "poll",
      content: "Best study spot on Hua Mak campus?",
      pollOptions: ["Library 4th floor", "The cafe near the lake", "Empty classrooms in AL building", "Home, honestly"],
      pollEndsAt: daysFromNow(3),
      pollVotes: { "0": [created[0].id, created[2].id], "1": [created[13].id], "3": [created[15].id, me.id] },
      createdAt: daysAgo(2),
    },
  });
  postIds.push(poll.id);
  // two posts by me so my own profile/feed has content
  // (createMany is not supported by Prisma's MongoDB connector)
  await prisma.post.create({
    data: {
      userId: me.id,
      username: me.username,
      postType: "text",
      content: "Testing out AU Connect locally. Impressed with how it feels already - nice work by the dev team.",
      pollOptions: [],
      createdAt: daysAgo(0, 2),
    },
  });
  await prisma.post.create({
    data: {
      userId: me.id,
      username: me.username,
      postType: "text",
      content: "If anyone needs help with server hosting or Docker questions, happy to help. Student admin here.",
      pollOptions: [],
      createdAt: daysAgo(3),
    },
  });
  console.log(`Created ${postIds.length} seed posts + 2 of yours.`);

  // ── 7. likes, comments (with denormalized counts) ────────────────────────
  const likeTypes: PostInteractionType[] = ["LIKE"];
  for (let i = 0; i < postIds.length; i++) {
    const likers = created.filter((_, idx) => (idx + i) % 3 === 0).slice(0, 6);
    let likes = 0;
    for (const l of likers) {
      await prisma.postInteraction.create({
        data: { userId: l.id, postId: postIds[i], type: likeTypes[0], createdAt: daysAgo(0, i % 5) },
      });
      likes++;
    }
    if (i % 4 === 0) {
      await prisma.postInteraction.create({
        data: { userId: me.id, postId: postIds[i], type: "LIKE", createdAt: daysAgo(0, 1) },
      });
      likes++;
    }
    await prisma.post.update({ where: { id: postIds[i] }, data: { likeCount: likes } });
  }
  await prisma.postInteraction.create({
    data: { userId: created[6].id, postId: postIds[0], type: "SHARE", createdAt: daysAgo(0, 1) },
  });
  await prisma.post.update({ where: { id: postIds[0] }, data: { shareCount: 1 } });

  const commentSpecs: { post: number; author: number; content: string; replyTo?: number }[] = [
    { post: 0, author: 1, content: "useState is a friendship you build over time. TypeScript is worth it, start after your project ships." },
    { post: 0, author: 14, content: "Same journey here, adding Redux next week. We can suffer together." },
    { post: 1, author: 0, content: "Applied! Any chance for students who only know React basics?" },
    { post: 1, author: 9, content: "Sharing with the marketing seniors too, the hybrid setup is great." },
    { post: 2, author: 8, content: "Professor, will the formula sheet be provided?" },
    { post: 3, author: 22, content: "45ms is sweet. Did you try the connection pooling tweak we discussed?" },
    { post: 5, author: 2, content: "Friday works! Bringing two friends." },
    { post: 6, author: 9, content: "I did the property tour round last year - memorize their service standards, it impresses the HR panel." },
    { post: 9, author: 2, content: "Adding this to the club's job board, thanks!" },
    { post: 12, author: 7, content: "Even after 4 years I still catch myself designing for speed over certainty. Great writeup." },
    { post: 13, author: 5, content: "Agreed on boring technology. Our contest robot runs on a stable stack from 2023 and it just works." },
    { post: 17, author: 0, content: "Saving this. The event calendar story is so relatable." },
  ];
  const commentRootIds: Record<number, string> = {};
  for (const c of commentSpecs) {
    const created1 = await prisma.comment.create({
      data: {
        userId: created[c.author].id,
        username: created[c.author].username,
        profilePic: "",
        postId: postIds[c.post],
        content: c.content,
        depth: 0,
        createdAt: daysAgo(0, 1),
      },
    });
    commentRootIds[c.post] = created1.id;
  }
  // two replies
  await prisma.comment.create({
    data: {
      userId: created[6].id,
      username: created[6].username,
      profilePic: "",
      postId: postIds[0],
      content: "Yes - React basics plus willingness to learn is exactly who the role is for.",
      parentId: commentRootIds[0],
      depth: 1,
      createdAt: daysAgo(0, 1),
    },
  });
  await prisma.comment.create({
    data: {
      userId: created[3].id,
      username: created[3].username,
      profilePic: "",
      postId: postIds[2],
      content: "No formula sheet. Chapter 6 needs the normal distribution table, which will be provided.",
      parentId: commentRootIds[2],
      depth: 1,
      createdAt: daysAgo(0, 1),
    },
  });
  for (const postIdx of Object.keys(commentRootIds)) {
    const count = await prisma.comment.count({ where: { postId: postIds[Number(postIdx)] } });
    await prisma.post.update({ where: { id: postIds[Number(postIdx)] }, data: { commentCount: count } });
  }
  console.log("Created likes, shares, comments and replies.");

  // ── 8. job posts ──────────────────────────────────────────────────────────
  for (const j of JOBS) {
    const post = await prisma.post.create({
      data: {
        userId: created[j.author].id,
        username: created[j.author].username,
        postType: "job_post",
        title: `${j.title} - ${j.company}`,
        content: j.details,
        pollOptions: [],
        createdAt: daysAgo(j.daysBack),
      },
    });
    const jobPost = await prisma.jobPost.create({
      data: {
        postId: post.id,
        jobTitle: j.title,
        companyName: j.company,
        location: j.location,
        locationType: j.locationType,
        employmentType: j.employmentType,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        salaryCurrency: "USD",
        jobDetails: j.details,
        positionsAvailable: 2,
        deadline: daysFromNow(30),
        status: "OPEN",
      },
    });
    for (const s of j.skills) {
      // Skill lookups are by normalizedName since the skills rework
      const skill = await prisma.skill.upsert({
        where: { normalizedName: normalizeSkillName(s) },
        create: { name: s, normalizedName: normalizeSkillName(s) },
        update: {},
      });
      await prisma.jobSkill.create({ data: { jobPostId: jobPost.id, skillId: skill.id } });
    }
  }
  console.log(`Created ${JOBS.length} job posts with skills.`);

  // ── 9. conversations + messages ───────────────────────────────────────────
  const convoSpecs: { withUser: number; messages: { from: "me" | "them"; text: string; hoursBack: number }[] }[] = [
    {
      withUser: 6,
      messages: [
        { from: "them", text: "Hi! Saw you're testing AU Connect. I'm recruiting juniors at SCB Abacus if any CS students you know are interested.", hoursBack: 30 },
        { from: "me", text: "Hey, thanks for reaching out! I know a few third-years looking for internships. Can I share the posting in the CS club group?", hoursBack: 28 },
        { from: "them", text: "Please do. Hybrid, 2 days in office. There's also a full-time track for final-year students.", hoursBack: 27 },
        { from: "them", text: "Also - is the login flow working smoothly for you? The team is still polishing things.", hoursBack: 2 },
      ],
    },
    {
      withUser: 0,
      messages: [
        { from: "them", text: "The seeded feed looks so real! Can you check if the poll widget renders on your machine?", hoursBack: 20 },
        { from: "me", text: "On it now.", hoursBack: 19 },
        { from: "them", text: "Thank you! Report any weirdness in the dev group 🙏", hoursBack: 18 },
      ],
    },
    {
      withUser: 19,
      messages: [
        { from: "them", text: "Hello! We'd love to post our management trainee program as an announcement once the admin app is ready. Who should I coordinate with?", hoursBack: 50 },
        { from: "me", text: "Hi! I'm helping with hosting/testing. The announcement feature needs the admin side, still in progress. I'll let you know when it's live.", hoursBack: 47 },
        { from: "them", text: "Perfect, thank you!", hoursBack: 46 },
      ],
    },
  ];
  for (const c of convoSpecs) {
    const them = created[c.withUser];
    const p = pair(me.id, them.id);
    const last = c.messages[c.messages.length - 1];
    const convo = await prisma.conversation.create({
      data: {
        userAId: p.userAId,
        userBId: p.userBId,
        participantAActorType: "USER",
        participantAUserId: p.userAId,
        participantBActorType: "USER",
        participantBUserId: p.userBId,
        lastMessageAt: new Date(Date.now() - last.hoursBack * 3600 * 1000),
        lastMessageText: last.text,
        lastMessageSenderId: last.from === "me" ? me.id : them.id,
        lastMessageSenderActorType: "USER",
        userAUnreadCount: p.userAId === me.id && last.from === "them" ? 1 : 0,
        userBUnreadCount: p.userBId === me.id && last.from === "them" ? 1 : 0,
        createdAt: new Date(Date.now() - (c.messages[0].hoursBack + 1) * 3600 * 1000),
      },
    });
    for (const m of c.messages) {
      await prisma.message.create({
        data: {
          conversationId: convo.id,
          senderId: m.from === "me" ? me.id : them.id,
          receiverId: m.from === "me" ? them.id : me.id,
          senderActorType: "USER",
          receiverActorType: "USER",
          text: m.text,
          kind: "TEXT",
          createdAt: new Date(Date.now() - m.hoursBack * 3600 * 1000),
        },
      });
    }
  }
  console.log(`Created ${convoSpecs.length} conversations with messages.`);

  // ── 10. a few extra notifications (likes/comments on my posts) ───────────
  const myPosts = await prisma.post.findMany({
    where: { userId: me.id },
    select: { id: true },
  });
  if (myPosts[0]) {
    await prisma.notification.create({
      data: { userId: me.id, fromUserId: created[1].id, type: "POST_LIKED", entityId: myPosts[0].id, createdAt: daysAgo(0, 1) },
    });
    await prisma.notification.create({
      data: { userId: me.id, fromUserId: created[6].id, type: "POST_COMMENTED", entityId: myPosts[0].id, createdAt: daysAgo(0, 1), isRead: true },
    });
  }

  console.log("\nSeed complete. Refresh the app and enjoy your fake social life.");
  console.log(`(All seed emails end in ${SEED_DOMAIN} - delete those users to unseed.)`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
