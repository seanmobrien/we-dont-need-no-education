import { LikeRedisClientType } from './like-redis-client';
import type { AssertAssignable } from './../../types/assert-assignable';

export type RedisClientType = LikeRedisClientType & {
    isOpen?: boolean;
};

type _RedisClientTypeIsLikeRedisClientTypeCompatible = AssertAssignable<
    Omit<RedisClientType, 'isOpen'>,
    LikeRedisClientType
>;