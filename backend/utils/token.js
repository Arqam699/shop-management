const jwt = require('jsonwebtoken');

const generateToken = (
  res,
  userId,
  shopId,
  authVersion = 0
) => {
  const token = jwt.sign(
    {
      userId,
      shopId,
      authVersion:
        Number(authVersion) || 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );

  res.cookie('token', token, {
    httpOnly: true,

    secure:
      process.env.NODE_ENV === 'production',

    sameSite:
      process.env.NODE_ENV === 'production'
        ? 'none'
        : 'lax',

    maxAge:
      7 *
      24 *
      60 *
      60 *
      1000,
  });

  return token;
};

module.exports = {
  generateToken,
};