import { useQuery } from '@apollo/client';
import { createTestInstance } from '@magento/peregrine';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { act } from 'react-test-renderer';
import { usePriceSummary } from '../usePriceSummary';
import { priceSummaryResponse } from '../__fixtures__/priceSummary';

jest.mock('@magento/peregrine/lib/context/cart', () => {
    const state = {
        cartId: 'cart123'
    };

    const api = {};

    const useCartContext = jest.fn(() => [state, api]);

    return { useCartContext };
});

jest.mock('@apollo/client', () => ({
    useQuery: jest.fn().mockReturnValue({
        error: null,
        loading: false,
        data: null
    })
}));

jest.mock('../priceSummary.gql', () => ({
    getPriceSummaryQuery: 'getPriceSummaryQuery'
}));

jest.mock('react-router-dom', () => ({
    useHistory: jest.fn(),
    useRouteMatch: jest.fn()
}));

const Component = props => {
    const talonProps = usePriceSummary(props);

    return <i {...talonProps} />;
};

it('returns the proper shape', () => {
    useQuery.mockReturnValue({
        error: null,
        loading: false,
        data: priceSummaryResponse
    });

    const rendered = createTestInstance(<Component />);

    const talonProps = rendered.root.findByType('i').props;

    expect(talonProps).toMatchSnapshot();
});

it('handles proceeding to checkout', () => {
    useQuery.mockReturnValue({
        error: null,
        loading: false,
        data: priceSummaryResponse
    });

    const historyPush = jest.fn();
    useHistory.mockReturnValue({
        push: historyPush
    });

    const rendered = createTestInstance(<Component />);

    const talonProps = rendered.root.findByType('i').props;

    const { handleProceedToCheckout } = talonProps;

    act(() => {
        handleProceedToCheckout();
    });

    expect(historyPush).toHaveBeenCalledWith('/checkout');
});

it('handles no returned data', () => {
    useQuery.mockReturnValue({
        error: null,
        loading: false,
        data: null
    });

    const rendered = createTestInstance(<Component />);

    const talonProps = rendered.root.findByType('i').props;

    const { flatData } = talonProps;

    expect(flatData).toStrictEqual({});
});
