import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    calculateBill,
    computeBillStatus,
    computeUnits,
    toBillingMonth,
} from './billing.calc';

// ─── computeUnits ────────────────────────────────────────────────

test('computeUnits - normal advancement', () => {
    assert.equal(computeUnits(100, 200, 99999), 100);
});

test('computeUnits - zero change', () => {
    assert.equal(computeUnits(100, 100, 99999), 0);
});

test('computeUnits - rollover (5-digit meter)', () => {
    // 99900 -> 99999 = 99 units, 0 -> 50 = 50 units, total 149.
    assert.equal(computeUnits(99900, 50, 99999), 149);
});

test('computeUnits - rollover at exact max', () => {
    // 99999 -> 0 is 0 units (meter at max, wrapped to 0 immediately).
    assert.equal(computeUnits(99999, 0, 99999), 0);
});

test('computeUnits - 4-digit meter rollover', () => {
    // 9900 -> 9999 = 99, 0 -> 100 = 100, total 199.
    assert.equal(computeUnits(9900, 100, 9999), 199);
});

test('computeUnits - throws on non-positive capacity', () => {
    assert.throws(() => computeUnits(100, 200, 0), /meterCapacity/);
    assert.throws(() => computeUnits(100, 200, -1), /meterCapacity/);
});

test('computeUnits - throws on negative reading', () => {
    assert.throws(() => computeUnits(-1, 200, 99999), /non-negative/);
});

// ─── calculateBill ───────────────────────────────────────────────

test('calculateBill - rent and electricity', () => {
    const result = calculateBill({
        fromReading: 100,
        toReading: 200,
        ratePerUnitPaise: 800,
        monthlyRentPaise: 500000,
        type: 'RENT_AND_ELECTRICITY',
        meterCapacity: 99999,
    });
    assert.deepEqual(result, {
        units: 100,
        electricityAmountPaise: 80000,
        rentAmountPaise: 500000,
        totalPaise: 580000,
    });
});

test('calculateBill - electricity only ignores rent', () => {
    const result = calculateBill({
        fromReading: 100,
        toReading: 200,
        ratePerUnitPaise: 800,
        monthlyRentPaise: 500000,
        type: 'ELECTRICITY_ONLY',
        meterCapacity: 99999,
    });
    assert.equal(result.rentAmountPaise, 0);
    assert.equal(result.totalPaise, 80000);
});

test('calculateBill - rollover with confirmation', () => {
    const result = calculateBill({
        fromReading: 99900,
        toReading: 50,
        ratePerUnitPaise: 800,
        monthlyRentPaise: 0,
        type: 'ELECTRICITY_ONLY',
        meterCapacity: 99999,
        confirmedRollover: true,
    });
    assert.equal(result.units, 149);
    assert.equal(result.electricityAmountPaise, 149 * 800);
});

test('calculateBill - rollover without confirmation throws', () => {
    assert.throws(
        () =>
            calculateBill({
                fromReading: 99900,
                toReading: 50,
                ratePerUnitPaise: 800,
                monthlyRentPaise: 0,
                type: 'ELECTRICITY_ONLY',
                meterCapacity: 99999,
            }),
        /rollover/,
    );
});

test('calculateBill - zero units still charges rent', () => {
    const result = calculateBill({
        fromReading: 100,
        toReading: 100,
        ratePerUnitPaise: 800,
        monthlyRentPaise: 500000,
        type: 'RENT_AND_ELECTRICITY',
        meterCapacity: 99999,
    });
    assert.equal(result.units, 0);
    assert.equal(result.electricityAmountPaise, 0);
    assert.equal(result.totalPaise, 500000);
});

test('calculateBill - rounds electricity to nearest paise', () => {
    // 100.5 units * 875 paise = 87937.5 -> 87938.
    const result = calculateBill({
        fromReading: 100,
        toReading: 200.5,
        ratePerUnitPaise: 875,
        monthlyRentPaise: 0,
        type: 'ELECTRICITY_ONLY',
        meterCapacity: 99999,
    });
    assert.equal(result.units, 100.5);
    assert.equal(result.electricityAmountPaise, 87938);
});

// ─── computeBillStatus ──────────────────────────────────────────

test('computeBillStatus - elec fully paid + rent paid → PAID', () => {
    assert.equal(
        computeBillStatus(
            { type: 'RENT_AND_ELECTRICITY', fromReading: 100, toReading: 200, rentPaid: true },
            200,
        ),
        'PAID',
    );
});

test('computeBillStatus - elec fully paid + rent unpaid → PARTIAL', () => {
    assert.equal(
        computeBillStatus(
            { type: 'RENT_AND_ELECTRICITY', fromReading: 100, toReading: 200, rentPaid: false },
            200,
        ),
        'PARTIAL',
    );
});

test('computeBillStatus - elec partially paid → PARTIAL', () => {
    assert.equal(
        computeBillStatus(
            { type: 'RENT_AND_ELECTRICITY', fromReading: 100, toReading: 200, rentPaid: false },
            150,
        ),
        'PARTIAL',
    );
});

test('computeBillStatus - nothing paid → UNPAID', () => {
    assert.equal(
        computeBillStatus(
            { type: 'RENT_AND_ELECTRICITY', fromReading: 100, toReading: 200, rentPaid: false },
            100,
        ),
        'UNPAID',
    );
});

test('computeBillStatus - rent paid only → PARTIAL', () => {
    assert.equal(
        computeBillStatus(
            { type: 'RENT_AND_ELECTRICITY', fromReading: 100, toReading: 200, rentPaid: true },
            100,
        ),
        'PARTIAL',
    );
});

test('computeBillStatus - electricity-only fully paid → PAID', () => {
    assert.equal(
        computeBillStatus(
            { type: 'ELECTRICITY_ONLY', fromReading: 100, toReading: 200, rentPaid: false },
            200,
        ),
        'PAID',
    );
});

// ─── toBillingMonth ─────────────────────────────────────────────

test('toBillingMonth - formats with zero padding', () => {
    assert.equal(toBillingMonth(new Date('2025-01-15')), '2025-01');
    assert.equal(toBillingMonth(new Date('2024-12-01')), '2024-12');
    assert.equal(toBillingMonth(new Date('2030-09-30')), '2030-09');
});
