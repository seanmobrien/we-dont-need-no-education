import * as next_package from 'next/package.json';

const this_package = {
    ...next_package,
} as const;
export { this_package as next_package };

export default this_package;
