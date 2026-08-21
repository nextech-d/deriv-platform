import { localize } from '@deriv-com/translations';
import './placeholder-desk.scss';

type TPlaceholderDeskProps = {
    title: string;
};

/** Empty desk shell — tab label only, content coming later. */
const PlaceholderDesk = ({ title }: TPlaceholderDeskProps) => (
    <div className='placeholder-desk' data-testid='placeholder-desk'>
        <p className='placeholder-desk__label'>{title}</p>
        <p className='placeholder-desk__hint'>{localize('Coming soon')}</p>
    </div>
);

export default PlaceholderDesk;
