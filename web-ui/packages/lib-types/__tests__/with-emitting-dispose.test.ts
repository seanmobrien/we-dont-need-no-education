import { withEmittingDispose } from '../src/with-emitting-dispose';

describe('withEmittingDispose', () => {
    it('calls original dispose first, then listeners, and clears listeners after dispose', () => {
        const callOrder: string[] = [];
        const input = {
            [Symbol.dispose]: () => {
                callOrder.push('original');
            },
        };

        const wrapped = withEmittingDispose(input);
        const listenerA = () => callOrder.push('listenerA');
        const listenerB = () => callOrder.push('listenerB');

        wrapped.addDisposeListener(listenerA);
        wrapped.addDisposeListener(listenerB);

        wrapped[Symbol.dispose]();
        wrapped[Symbol.dispose]();

        expect(callOrder).toEqual(['original', 'listenerA', 'listenerB', 'original']);
    });

    it('supports removeDisposeListener', () => {
        const listener = jest.fn();
        const wrapped = withEmittingDispose({});

        wrapped.addDisposeListener(listener);
        wrapped.removeDisposeListener(listener);
        wrapped[Symbol.dispose]();

        expect(listener).not.toHaveBeenCalled();
    });

    it('works when no original Symbol.dispose exists', () => {
        const listener = jest.fn();
        const wrapped = withEmittingDispose({ value: 1 });

        wrapped.addDisposeListener(listener);
        wrapped[Symbol.dispose]();

        expect(listener).toHaveBeenCalledTimes(1);
        expect((wrapped as { value: number }).value).toBe(1);
    });
});