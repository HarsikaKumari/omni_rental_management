import { describe, it, expect } from 'vitest';
import {
    calcElectricityAmountPaise,
    paiseToRupees,
    roundPaise,
    rupeesToPaise,
} from './money';

describe('paiseToRupees', () => {
    it('divides by 100', () => {
        expect(paiseToRupees(80000)).toBe(800);
        expect(paiseToRupees(0)).toBe(0);
        expect(paiseToRupees(875)).toBe(8.75);
    });
});

describe('rupeesToPaise', () => {
    it('multiplies by 100 and rounds half up', () => {
        expect(rupeesToPaise(800)).toBe(80000);
        expect(rupeesToPaise(8.75)).toBe(875);
        expect(rupeesToPaise(8.755)).toBe(876); // 875.5 → 876, not 875
        expect(rupeesToPaise(0)).toBe(0);
    });
});

describe('roundPaise', () => {
    it('rounds to nearest integer paise', () => {
        expect(roundPaise(1234.4)).toBe(1234);
        expect(roundPaise(1234.6)).toBe(1235);
        expect(roundPaise(1234.5)).toBe(1235);
    });
});

describe('calcElectricityAmountPaise', () => {
    it('multiplies units by rate and rounds', () => {
        expect(calcElectricityAmountPaise(100, 800)).toBe(80000);
        expect(calcElectricityAmountPaise(100.5, 875)).toBe(87938); // 87937.5 → 87938
        expect(calcElectricityAmountPaise(0, 800)).toBe(0);
    });
});
