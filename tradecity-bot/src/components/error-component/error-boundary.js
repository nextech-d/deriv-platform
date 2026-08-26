import React from 'react';
import PropTypes from 'prop-types';
import { isChunkLoadError } from '@/utils/lazy-with-retry';
import ErrorComponent from './index';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, resetKey: 0 };
        this.chunk_retries = 0;
    }

    componentDidCatch = (error, info) => {
        if (window.TrackJS) window.TrackJS.console.log(this.props.root_store);

        if (isChunkLoadError(error) && this.chunk_retries < 2) {
            this.chunk_retries += 1;
            window.setTimeout(() => {
                this.setState(prev => ({
                    hasError: false,
                    error: null,
                    info: null,
                    resetKey: prev.resetKey + 1,
                }));
            }, 400 * this.chunk_retries);
            return;
        }

        this.setState({
            hasError: true,
            error,
            info,
        });
    };

    render = () => {
        if (this.state.hasError) {
            if (this.props.fallback !== undefined) return this.props.fallback;
            return <ErrorComponent should_show_refresh={true} />;
        }
        return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
    };
}

ErrorBoundary.propTypes = {
    root_store: PropTypes.object,
    fallback: PropTypes.node,
    children: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
};

export default ErrorBoundary;
