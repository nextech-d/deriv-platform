import React from 'react';
import classNames from 'classnames';
import { useFormikContext } from 'formik';
import { observer } from 'mobx-react-lite';
import Text from '@/components/shared_ui/text';
import ThemedScrollbars from '@/components/shared_ui/themed-scrollbars';
import { useStore } from '@/hooks/useStore';
import { localize } from '@deriv-com/translations';
import { STRATEGIES } from '../config';
import { TFormValues } from '../types';
import FormTabs from './form-tabs';
import QSStepper from './qs-stepper';
import StrategyTabContent from './strategy-tab-content';
import StrategyTemplatePicker from './strategy-template-picker';
import { QsSteps } from './trade-constants';

type TMobileFormWrapper = {
    children: React.ReactNode;
    selected_trade_type: string;
    setSelectedTradeType: (selected_trade_type: string) => void;
    current_step: QsSteps;
    setCurrentStep: (current_step: QsSteps) => void;
};

const MobileFormWrapper = observer(
    ({ children, current_step, selected_trade_type, setCurrentStep, setSelectedTradeType }: TMobileFormWrapper) => {
        const { isValid, validateForm } = useFormikContext<TFormValues>();
        const { quick_strategy } = useStore();
        const { selected_strategy } = quick_strategy;
        const selected_startegy_label = STRATEGIES()[selected_strategy as keyof typeof STRATEGIES].label;
        const description = STRATEGIES()[selected_strategy as keyof typeof STRATEGIES]?.description;
        const strategy_description = description?.length ? description : undefined;
        const [active_tab, setActiveTab] = React.useState('TRADE_PARAMETERS');
        const is_verified_or_completed_step =
            current_step === QsSteps.StrategyVerified || current_step === QsSteps.StrategyCompleted;
        const is_selected_strategy_step = current_step === QsSteps.StrategySelect;

        React.useEffect(() => {
            setActiveTab('TRADE_PARAMETERS');
        }, [selected_strategy, is_selected_strategy_step]);

        React.useEffect(() => {
            validateForm();
        }, [selected_strategy, validateForm]);

        React.useEffect(() => {
            if (isValid && current_step === QsSteps.StrategyVerified) {
                setCurrentStep(QsSteps.StrategyCompleted);
            }
            if (!isValid && current_step === QsSteps.StrategyCompleted) {
                setCurrentStep(QsSteps.StrategyVerified);
            }
        }, [isValid, current_step]);

        return (
            <div className='qs'>
                <div className='qs__body'>
                    <div className='qs__body__content'>
                        <ThemedScrollbars
                            className={classNames('qs__form__container qs__form__container--footer', {
                                'qs__form__container--template': is_selected_strategy_step,
                            })}
                            autohide={false}
                        >
                            <QSStepper
                                setCurrentStep={setCurrentStep}
                                current_step={current_step}
                                isValid={isValid}
                                is_mobile
                            />
                            {is_selected_strategy_step && (
                                <StrategyTemplatePicker
                                    setSelectedTradeType={setSelectedTradeType}
                                    setCurrentStep={setCurrentStep}
                                />
                            )}
                            {is_verified_or_completed_step && (
                                <>
                                    <div className='qs__selected-options'>
                                        <div className='qs__selected-options__item'>
                                            <Text size='xs'>{localize('Trade type')}</Text>
                                            <Text size='xs' weight='bold'>
                                                {selected_trade_type}
                                            </Text>
                                        </div>
                                        <div className='qs__selected-options__item'>
                                            <Text size='xs'>{localize('Strategy')}</Text>
                                            <Text
                                                className='qs__selected-options__item__description'
                                                size='xs'
                                                weight='bold'
                                            >
                                                {selected_startegy_label}
                                            </Text>
                                        </div>
                                    </div>
                                    <FormTabs
                                        active_tab={active_tab}
                                        onChange={setActiveTab}
                                        description={strategy_description}
                                    />
                                    <StrategyTabContent formfields={children} active_tab={active_tab} />
                                </>
                            )}
                        </ThemedScrollbars>
                    </div>
                </div>
            </div>
        );
    }
);

export default MobileFormWrapper;
