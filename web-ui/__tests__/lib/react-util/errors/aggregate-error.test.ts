import { AggregateError } from '/lib/react-util/errors/aggregate-error';

describe('AggregateError', () => {
  it('should create an instance of AggregateError', () => {
    const error1 = new Error('First error');
    const error2 = new Error('Second error');
    const aggregateError = new AggregateError('Primary error', error1, error2);

    expect(aggregateError).toBeInstanceOf(AggregateError);
    expect(aggregateError.message).toContain('Primary error');
    expect(aggregateError.message).toContain('First error');
    expect(aggregateError.message).toContain('Second error');
  });

  it('should check if an error is an instance of AggregateError', () => {
    const error1 = new Error('First error');
    const error2 = new Error('Second error');
    const aggregateError = new AggregateError('Primary error', error1, error2);

    expect(AggregateError.isAggregateError(aggregateError)).toBe(true);
    expect(AggregateError.isAggregateError(error1)).toBe(false);
  });

  it('should return the correct count of errors', () => {
    const error1 = new Error('First error');
    const error2 = new Error('Second error');
    const aggregateError = new AggregateError('Primary error', error1, error2);

    expect(aggregateError.count).toBe(2);
  });

  it('should retrieve the error at the specified index', () => {
    const error1 = new Error('First error');
    const error2 = new Error('Second error');
    const aggregateError = new AggregateError('Primary error', error1, error2);

    expect(aggregateError.get(0)).toBe(error1);
    expect(aggregateError.get(1)).toBe(error2);
  });

  it('should iterate over the errors', () => {
    const error1 = new Error('First error');
    const error2 = new Error('Second error');
    const aggregateError = new AggregateError('Primary error', error1, error2);

    const errors = [];
    for (const error of aggregateError.all()) {
      errors.push(error);
    }

    expect(errors).toEqual([error1, error2]);
  });

  it('should convert the aggregate error to a string representation', () => {
    const error1 = new Error('First error');
    const error2 = new Error('Second error');
    const aggregateError = new AggregateError('Primary error', error1, error2);

    expect(aggregateError.toString()).toBe(aggregateError.message);
  });

  it('should create an instance of AggregateError from an array of errors', () => {
    const error1 = new Error('First error');
    const error2 = new Error('Second error');
    const aggregateError = AggregateError.fromErrors([error1, error2]);

    expect(aggregateError).toBeInstanceOf(AggregateError);
    expect(aggregateError.message).toContain('First error');
    expect(aggregateError.message).toContain('Second error');
  });
});
