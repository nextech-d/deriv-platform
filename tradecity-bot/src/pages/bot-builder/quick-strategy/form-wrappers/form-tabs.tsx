import React, { KeyboardEvent } from 'react';
import classNames from 'classnames';
import Text from '@/components/shared_ui/text';
import { FORM_TABS } from '../config';
import { TDescriptionItem } from '../types';

type TFormTabs = {
    active_tab: string;
    onChange: (tab: string) => void;
    description?: TDescriptionItem[] | string;
};

const hasDescription = (description?: TDescriptionItem[] | string) =>
    Array.isArray(description) ? description.length > 0 : Boolean(description);

const FormTabs: React.FC<TFormTabs> = ({ active_tab, onChange, description }) => (
    <div className='qs__body__content__head'>
        <div className='qs__body__content__head__tabs'>
            {FORM_TABS().map((tab, index) => {
                const active = tab.value === active_tab;
                const disabled = !hasDescription(description) && Boolean(tab?.disabled);
                const cs = 'qs__body__content__head__tabs__tab';
                return (
                    <span
                        tabIndex={disabled ? -1 : index}
                        className={classNames(cs, {
                            active,
                            disabled,
                        })}
                        key={tab.value}
                        onClick={() => {
                            if (!disabled) {
                                onChange(tab.value);
                            }
                        }}
                        onKeyDown={(e: KeyboardEvent) => {
                            if (e.key === 'Enter' && !disabled) {
                                onChange(tab.value);
                            }
                        }}
                    >
                        <Text size='xs' weight={active ? 'bold' : 'lighter'}>
                            {tab.label}
                        </Text>
                    </span>
                );
            })}
        </div>
    </div>
);

export default FormTabs;
