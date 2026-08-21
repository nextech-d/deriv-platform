type TBrandLogoProps = {
    width?: number;
    height?: number;
    fill?: string;
    className?: string;
};

/** TradeCity wordmark — matches deriv-platform accent / dangote layout. */
export const BrandLogo = ({
    width = 132,
    height = 32,
    fill = 'currentColor',
    className = '',
}: TBrandLogoProps) => {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 132 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-label="TradeCity"
            role="img"
        >
            <text
                x="0"
                y="22"
                fontFamily="'IBM Plex Sans', system-ui, sans-serif"
                fontSize="18"
                fontWeight="700"
                fill={fill}
                letterSpacing="-0.02em"
            >
                Trade
            </text>
            <text
                x="58"
                y="22"
                fontFamily="'IBM Plex Sans', system-ui, sans-serif"
                fontSize="18"
                fontWeight="700"
                fill="#ff444f"
                letterSpacing="-0.02em"
            >
                City
            </text>
        </svg>
    );
};
