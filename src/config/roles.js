const allRoles = {
  user: [],
  moderator: ['getUsers', 'manageNotes'],
  admin: ['getUsers', 'manageUsers', 'manageNotes'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
