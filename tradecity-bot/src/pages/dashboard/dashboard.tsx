import React from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { useDevice } from '@deriv-com/ui';
import OnboardTourHandler from '../tutorials/dbot-tours/onboarding-tour';
import Cards from './cards';
import HeroHeadline from './hero-headline';
import InfoPanel from './info-panel';

type TMobileIconGuide = {
    handleTabChange: (active_number: number) => void;
};

const DashboardComponent = observer(({ handleTabChange }: TMobileIconGuide) => {
    const { dashboard } = useStore();
    const { active_tab, active_tour } = dashboard;
    const { isDesktop } = useDevice();

    return (
        <React.Fragment>
            <div
                className={classNames('tab__dashboard', {
                    'tab__dashboard--tour-active': active_tour,
                })}
            >
                <div className='tab__dashboard__content'>
                    <div className='tab__dashboard__hero dashboard-hero'>
                        <div className='dashboard-hero__sky' aria-hidden='true'>
                            <span className='dashboard-hero__moon' />
                            <span className='dashboard-hero__stars' />
                            <span className='dashboard-hero__haze' />
                        </div>
                        <div className='dashboard-hero__copy'>
                            <HeroHeadline />
                            <p className='dashboard-hero__quote'>
                                <span aria-hidden='true'>🌟 </span>
                                One good trade can change your day.
                            </p>
                        </div>
                        <div className='quick-panel'>
                            <Cards is_mobile={!isDesktop} handleTabChange={handleTabChange} />
                        </div>
                    </div>
                </div>
            </div>
            <InfoPanel />
            {active_tab === 0 && <OnboardTourHandler is_mobile={!isDesktop} />}
        </React.Fragment>
    );
});

export default DashboardComponent;
