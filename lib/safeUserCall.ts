export const safeUserSelect = {
  id: true,
  username: true,
  profilePic: true,
  profilePicOriginal: true,
  profilePicCrop: true,
  coverPhoto: true,
  coverPhotoOriginal: true,
  coverPhotoCrop: true,
  title: true,
  location: true,
  about: true,
  connections: true,

  email: true,
  phoneNo: true,
  phonePublic: true,
  emailPublic: true,

  experience: {
    select: {
      id: true,
      title: true,
      employmentType: true,
      company: true,
      startMonth: true,
      startYear: true,
      endMonth: true,
      endYear: true,
      isCurrent: true,
    },
  },

  education: {
    select: {
      id: true,
      school: true,
      degree: true,
      fieldOfStudy: true,
      startMonth: true,
      startYear: true,
      endMonth: true,
      endYear: true,
    },
  },

  posts: {
    select: {
      id: true,
      content: true,
      title: true,
      postType: true,
      visibility: true,
      profilePic: true,
      username: true,
      createdAt: true,
      media: true,
    },
  },

};
