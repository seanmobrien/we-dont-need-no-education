import React from 'react';
import { asyncRender, screen, waitFor } from '@/__tests__/test-utils';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import { Loading } from '@/components/general/loading';
const theme = createTheme();
const LoadingWrapper = ({ loading, errorMessage, }) => (<ThemeProvider theme={theme}>
    <Loading loading={loading} errorMessage={errorMessage}/>
  </ThemeProvider>);
describe('Loading Component Updates', () => {
    it('renders loading state with Card-based UI pattern', async () => {
        await asyncRender(<LoadingWrapper loading={true} errorMessage={null}/>);
        await waitFor(() => screen.getByText('Loading...'));
        const cardContent = document.querySelector('.MuiCardContent-root');
        expect(cardContent).toBeInTheDocument();
        const linearProgress = document.querySelector('.MuiLinearProgress-root');
        expect(linearProgress).toBeInTheDocument();
        const circularProgress = document.querySelector('.MuiCircularProgress-root');
        expect(circularProgress).not.toBeInTheDocument();
    });
    it('maintains compatibility with existing error message behavior', async () => {
        const errorMessage = 'Test error message';
        await asyncRender(<LoadingWrapper loading={false} errorMessage={errorMessage}/>);
        expect(screen.getByText('Error:')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    it('renders nothing when not loading and no error', async () => {
        const { container } = await asyncRender(<LoadingWrapper loading={false} errorMessage={null}/>);
        expect(container.firstChild).toBeNull();
    });
});
//# sourceMappingURL=loading-component-updates.test.jsx.map