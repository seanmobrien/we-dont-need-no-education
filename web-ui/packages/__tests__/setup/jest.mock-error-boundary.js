import { Component, createElement } from 'react';
export default class ErrorBoundary extends Component {
    #fallbackRender;
    #children;
    #onReset;
    #onError;
    constructor(props) {
        super(props);
        const { fallbackRender, onReset, onError } = props;
        this.#fallbackRender = fallbackRender;
        this.#onReset = onReset;
        this.#onError = onError;
        this.#children = props.children;
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        if (this.#onError) {
            this.#onError(error, errorInfo || { componentStack: 'test-component-stack' });
        }
    }
    render() {
        try {
            if ('hasError' in this.state && this.state.hasError) {
                const error = 'error' in this.state && !!this.state.error
                    ? this.state.error
                    : new Error('An error occurred');
                if (this.#fallbackRender) {
                    const FallbackWrapper = () => this.#fallbackRender({
                        error,
                        resetErrorBoundary: () => {
                            this.setState({ hasError: false, error: null });
                            this.#onReset?.();
                        },
                    });
                    return createElement(FallbackWrapper);
                }
                return createElement('div', { role: 'alert' }, String(error));
            }
            return this.#children;
        }
        catch (error) {
            if (!this.state.hasError) {
                this.setState({ hasError: true, error: error });
                if (this.#onError) {
                    this.#onError(error, {
                        componentStack: 'test-component-stack',
                    });
                }
            }
            return createElement('div', { role: 'alert' }, String(error));
        }
    }
}
//# sourceMappingURL=jest.mock-error-boundary.js.map