# 🌐 AU Connect

> **AU Connect** is an exclusive social networking platform for **Assumption University** — connecting **students, professors, and alumni** in one professional community, allowing users to create professional profiles, share updates, and stay connected with the AU family.

---

### 👤 Members

- Thant Zin Min
- Min Thant
- Si Thu Naung

---

## ✨ Features

- 👤 **Professional Profile**
  - Create and update a digital résumé (education, skills, experience)
- 📰 **Home Feed**
  - View and share the latest AU news, job opportunities, and achievements
- 🤝 **Connections**
  - Follow and make friends with students and alumni
- 💬 **Chat Box**
  - Real-time messaging with friends and mentors
- 🪪 **User Authentication**
  - Secure Google sign-in powered by NextAuth.js
- 📝 **Create Post**
  - Publish posts with text and media
- 📩 **Friend Requests**
  - Send, accept, and manage connection invitations

---

## 🧠 Tech Stack

Video posts allow 1 video per post, maximum 512 MB (512,000,000 bytes).
Accepted formats are MP4, MOV, and WebM, with no duration limit.
The frontend checks `File.size` immediately; the backend verifies Azure Blob
`contentLength`, the file signature, ownership, and attachment rules. Validation
reads only the first 4 KB of video bytes and requires no media-processing tools.

| Layer | Technology |
|:------|:------------|
| **Frontend** | [Next.js 14+](https://nextjs.org/), [React 18+](https://react.dev/), [Tailwind CSS 3+](https://tailwindcss.com/) |
| **Backend** | Next.js API Routes, [Prisma ORM](https://www.prisma.io/) |
| **Database** | [MongoDB Atlas](https://www.mongodb.com/atlas/database) |
| **Authentication** | [NextAuth.js + Google OAuth 2.0](https://next-auth.js.org/providers/google) |
| **Version Control** | Git + GitHub |
| **Deployment (TBD)** | - |
| **Design** | Figma (UI / UX Prototype) |

---
