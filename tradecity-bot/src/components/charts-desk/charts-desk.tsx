import type { ReactNode } from 'react';
import './charts-desk.scss';

interface ChartsDeskProps {
    children: ReactNode;
}

/** Chrome around the Charts tab. SmartCharts behaviour stays in ChartWrapper. */
const ChartsDesk = ({ children }: ChartsDeskProps) => (
    <div className='charts-desk'>
        <header className='charts-desk__header'>
            <h2>Charts</h2>
        </header>
        <div className='charts-desk__body'>
            <div className='charts-desk__window'>{children}</div>
        </div>
    </div>
);

export default ChartsDesk;
