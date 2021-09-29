import { useGiftCard } from '@magento/peregrine/lib/talons/CartPage/GiftCards/useGiftCards';
import Price from '@magento/venia-ui/lib/components/Price';
import React, { Fragment } from 'react';
import { FormattedMessage } from 'react-intl';
import { useStyle } from '../../../classify';
import LinkButton from '../../LinkButton';
import defaultClasses from './giftCard.css';

const GiftCard = props => {
    const { code, currentBalance, isRemovingCard } = props;

    const { removeGiftCardWithCode } = useGiftCard({
        code
    });

    const classes = useStyle(defaultClasses, props.classes);

    return (
        <Fragment>
            <div className={classes.card_info}>
                <span className={classes.code}>{code}</span>
                <span className={classes.balance}>
                    <FormattedMessage
                        id={'giftCard.balance'}
                        defaultMessage={'Balance: '}
                    />
                    <Price
                        value={currentBalance.value}
                        currencyCode={currentBalance.currency}
                    />
                </span>
            </div>
            <LinkButton
                disabled={isRemovingCard}
                onClick={removeGiftCardWithCode}
            >
                <FormattedMessage
                    id={'giftCard.remove'}
                    defaultMessage={'Remove'}
                />
            </LinkButton>
        </Fragment>
    );
};

export default GiftCard;
