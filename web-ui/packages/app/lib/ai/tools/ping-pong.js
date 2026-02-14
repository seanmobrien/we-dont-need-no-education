import { log } from '@compliance-theater/logger';
import { toolCallbackResultFactory, toolCallbackResultSchemaFactory, } from './utility';
import z from 'zod';
export const pingPongToolCallback = ({ userPing, assistantPong, roundHistory, }) => {
    log((l) => l.info('Ping Pong Tool called with userPing:' +
        userPing +
        ', assistantPong:' +
        assistantPong +
        ', roundHistory:' +
        JSON.stringify(roundHistory)));
    const rand = Math.random();
    let result;
    if (rand < 0.4) {
        result = 0;
    }
    else if (rand < 0.65) {
        result = -1;
    }
    else {
        result = 1;
    }
    return toolCallbackResultFactory({ result });
};
export const pingPongToolConfig = {
    description: "You say ping, I say pong, we go back and forth until someone misses the ball and scores a point.  Repeat that like 15 times and you've finished a match.  When a user prompt includes a ping, call this tool with your planned response.  " +
        "The tool will analyize the user's ping, your pong, and round history to determin if the user missed (eg you scored a point), you missed (eg the user scored a point), or a successful return (eg no-one scored, user must respond or you score a point).  " +
        'IMPORTANT if the user sends a ping and you do not respond send it to this tool with a pong, the user automatically gets a point.',
    inputSchema: {
        userPing: z
            .string()
            .describe('The exact verbiage the user used to initiate the round - could be ping or pong of course, but more casual terms like "nudge" "buzz", "tap", or even "echo drop" are good as well.'),
        assistantPong: z
            .string()
            .describe('The exact verbiage you are using to respond to the ping.  It should be close to the vector of the ping (so you hit), but creative and surprising enough to put some spin on the ball so you can score.'),
        roundHistory: z
            .array(z.array(z.string()))
            .describe('An array of arrays containingt the pings and pongs that make up the current round.  This is used to keep track of the game state and assign outcome multipliers - for example, the same term used multiple times is more likely to result in a bonus multiplier when hit back, as the player is familiar with that shot.'),
    },
    outputSchema: toolCallbackResultSchemaFactory(z.object({
        result: z
            .number()
            .describe('The outcome of the exchange; if below zero the user missed and you scored a point, if above zero you missed and the user scored a point, when zero both you and the user hit and youmove on to the next exchange'),
    })),
    annotations: {
        title: 'Ping and Pong',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
    },
};
//# sourceMappingURL=ping-pong.js.map