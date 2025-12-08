export const safeUserSelect = {
  id: true,
  username: true,
  profilePic: true,
  coverPhoto: true,
  title: true,
  location: true,
  about: true,
  connections: true,

  phoneNo: true,
  phonePublic: true,
  emailPublic: true,
  
  experience: {
    select: { id: true, role: true, company: true, period: true },
  },
  education: {
    select: { id: true, school: true, degree: true, period: true },
  },
  posts: {
    select: { id: true, content: true, image: true, createdAt: true },
  },
};
