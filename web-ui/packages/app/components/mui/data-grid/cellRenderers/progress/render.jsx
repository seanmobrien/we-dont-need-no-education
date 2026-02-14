import * as React from 'react';
import clsx from 'clsx';
import Center from '../render-helpers/center';
import Element from './element';
import Value from './value';
import Bar from './bar';
const ProgressBar = React.memo(function ProgressBar(props) {
    const { value } = props ?? { value: 0 };
    const rawValueInPercent = value * 100;
    const valueInPercent = Math.abs(rawValueInPercent);
    const classes = clsx({
        low: valueInPercent < 30,
        medium: valueInPercent >= 30 && valueInPercent <= 70,
        high: valueInPercent > 70,
    });
    const style = { maxWidth: `${valueInPercent}%` };
    return (<Element>
      <Value>{`${rawValueInPercent.toLocaleString()} %`}</Value>
      <Bar className={classes} style={style} negative={value < 0}/>
    </Element>);
});
const Progress = (params) => {
    const value = params?.value;
    if (typeof value === 'undefined' || value === null) {
        return <></>;
    }
    return (<Center>
      <ProgressBar value={value}/>
    </Center>);
};
export default Progress;
//# sourceMappingURL=render.jsx.map