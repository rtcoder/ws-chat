const {asc, eq, ne} = require('drizzle-orm');
const {db} = require('../../db/db');
const {users} = require('../../db/schema');

const listUsers = async (req, res) => {
  try {
    const rows = await db
      .select({
        _id: users.id,
        first_name: users.firstName,
        last_name: users.lastName,
        avatar: users.avatar,
      })
      .from(users)
      .where(ne(users.id, req.user.user_id))
      .orderBy(asc(users.firstName), asc(users.lastName));

    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
};

module.exports = {
  listUsers,
};
