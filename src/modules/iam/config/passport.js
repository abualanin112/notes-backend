const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { config } = require('../../infrastructure');
const {
  tokens: { tokenTypes },
} = require('../../shared');
const { userRepository } = require('../../../repositories');

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (payload, done) => {
  try {
    if (payload.type !== tokenTypes.ACCESS) {
      throw new Error('Invalid token type');
    }
    const user = await userRepository.findById(payload.sub, {
      select: {
        id: true,
        name: true,
        email: true,
        isEmailVerified: true,
      },
    });
    if (!user) {
      return done(null, false);
    }
    done(null, user);
  } catch (error) {
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

module.exports = {
  jwtStrategy,
};
