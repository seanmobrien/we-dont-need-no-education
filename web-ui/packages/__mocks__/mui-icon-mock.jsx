export const MockIcon = (props) => {
    return (<div>
      <span>Mock Icon: {props?.['data-icon']}</span>
      <svg data-testid='mui-icon' data-icon={props?.['data-icon']} {...props}/>
    </div>);
};
export default MockIcon;
//# sourceMappingURL=mui-icon-mock.jsx.map