import { generateOAuthURL } from '@/components/shared';
import { PLATFORM_TABS, tabIndexById } from '@/constants/platform-tabs';
import './site-map-footer.scss';

type SiteMapFooterProps = {
    onNavigate: (tab_index: number) => void;
};

const GROUPS: { heading: string; ids: string[] }[] = [
    { heading: 'Desk', ids: ['dashboard', 'bot_builder', 'free_bots'] },
    {
        heading: 'Trade',
        ids: ['d_trader', 'analysis_tool', 'signal_center', 'money_management', 'copy_trader'],
    },
    {
        heading: 'Studio',
        ids: ['edging', 'edging_2', 'fast_trader', 'chart', 'ultimate_bot', 'bulk_trader'],
    },
];

const FEATURES = [
    { label: 'Display', detail: 'KES · UGX · TZS · RWF · USD' },
    { label: 'Markets', detail: 'Volatility · Boom/Crash' },
    { label: 'Execution', detail: 'Manual · Auto · Copy' },
    { label: 'Funding', detail: 'Cashier · East Africa agents' },
] as const;

const tabById = (id: string) => PLATFORM_TABS.find(tab => tab.id === id);

const openAuth = async (prompt?: string) => {
    const oauthUrl = await generateOAuthURL(prompt);
    if (oauthUrl) {
        window.location.replace(oauthUrl);
        return;
    }
    console.error('Failed to generate OAuth URL');
};

const SiteMapFooter = ({ onNavigate }: SiteMapFooterProps) => (
    <footer className='site-map-footer'>
        <div className='site-map-footer__inner'>
            <div className='site-map-footer__top'>
                <div className='site-map-footer__brand'>
                    <p className='site-map-footer__word'>
                        <span className='site-map-footer__word-trade'>Trade</span>
                        <span className='site-map-footer__word-city'>City</span>
                    </p>
                    <p className='site-map-footer__tagline'>
                        Synthetics desk for East Africa — one feed for Manual, Auto, and Copy.
                    </p>
                    <dl className='site-map-footer__spec'>
                        {FEATURES.map(feature => (
                            <div key={feature.label} className='site-map-footer__spec-row'>
                                <dt>{feature.label}</dt>
                                <dd>{feature.detail}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <nav className='site-map-footer__sitemap' aria-label='Site map'>
                    {GROUPS.map(group => (
                        <div key={group.heading} className='site-map-footer__group'>
                            <p className='site-map-footer__heading'>{group.heading}</p>
                            <ul className='site-map-footer__list'>
                                {group.ids.map(id => {
                                    const tab = tabById(id);
                                    if (!tab) return null;
                                    return (
                                        <li key={tab.id}>
                                            <button
                                                type='button'
                                                className='site-map-footer__link'
                                                onClick={() => onNavigate(tabIndexById(tab.id))}
                                            >
                                                {tab.label}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                    <div className='site-map-footer__group'>
                        <p className='site-map-footer__heading'>Access</p>
                        <ul className='site-map-footer__list'>
                            <li>
                                <button type='button' className='site-map-footer__link' onClick={() => openAuth()}>
                                    Log in
                                </button>
                            </li>
                            <li>
                                <button
                                    type='button'
                                    className='site-map-footer__link'
                                    onClick={() => openAuth('registration')}
                                >
                                    Sign up
                                </button>
                            </li>
                        </ul>
                    </div>
                </nav>
            </div>

            <div className='site-map-footer__disclosure'>
                <p className='site-map-footer__label'>Risk disclosure</p>
                <p className='site-map-footer__body'>
                    Synthetic indices and leveraged products carry high risk. This platform is a third-party app using
                    the Deriv API — not affiliated with Deriv.Com Limited. Not regulated by Kenya’s CMA. Never trade
                    money you cannot afford to lose.
                </p>
            </div>
        </div>

        <div className='site-map-footer__bottom'>
            <p>© {new Date().getFullYear()} TradeCity</p>
            <p className='site-map-footer__mark'>East Africa</p>
            <p>
                <a href='https://api.deriv.com' target='_blank' rel='noopener noreferrer'>
                    Deriv API
                </a>
            </p>
        </div>
    </footer>
);

export default SiteMapFooter;
