type TBrandLogoProps = {
    width?: number;
    height?: number;
    fill?: string;
    className?: string;
};

/** TradeCity wordmark — condensed name, City in brand red. */
export const BrandLogo = ({
    width: _width = 132,
    height: _height = 32,
    fill = 'currentColor',
    className = '',
}: TBrandLogoProps) => {
    return (
        <span className={`app-header__name ${className}`.trim()} style={{ color: fill }} role='img' aria-label='TradeCity'>
            Trade<span>City</span>
        </span>
    );
};
