import dayjs from 'dayjs';
import { config } from '../../src/infrastructure/config.js';
import { tokenTypes } from '../../src/shared/Tokens.js';
import * as tokenService from '../../src/modules/iam/services/token.service.js';
import { userOne, admin } from './user.fixture.js';

const accessTokenExpires = dayjs().add(config.jwt.accessExpirationMinutes, 'minutes');
const userOneAccessToken = tokenService.generateToken(userOne.id, accessTokenExpires, tokenTypes.ACCESS);
const adminAccessToken = tokenService.generateToken(admin.id, accessTokenExpires, tokenTypes.ACCESS);

export { userOneAccessToken, adminAccessToken };
