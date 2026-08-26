type TBrandLogoProps = {
    width?: number;
    height?: number;
    fill?: string;
    className?: string;
};

/** TradeCity wordmark — condensed TRADE + italic serif City. */
export const BrandLogo = ({
    width: _width = 132,
    height: _height = 32,
    fill = 'currentColor',
    className = '',
}: TBrandLogoProps) => {
    return (
        <span className={`app-header__name ${className}`.trim()} style={{ color: fill }} role='img' aria-label='TradeCity'>
            <span className='app-header__name-trade'>Trade</span>
            <span className='app-header__name-city'>City</span>
        </span>
    );
};
