import { styled } from '@mui/material/styles';
const Center = ({ children, height = 1, }) => {
    const transformedHeight = height <= 1 ? height * 100 + '%' : height + '%';
    const StyledDiv = styled('div')({
        height: transformedHeight,
        display: 'flex',
        alignItems: 'center',
    });
    return <StyledDiv>{children}</StyledDiv>;
};
export default Center;
//# sourceMappingURL=center.jsx.map