import { Router } from 'express';
import {
    createBill,
    getBill,
    listBills,
    markPaid,
    paidTill,
    previewBill,
    rentPaid,
} from '../controllers/bill.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
    billIdParamSchema,
    generateBillSchema,
    listBillsQuerySchema,
    paidTillSchema,
    previewBillSchema,
} from '../validators/bill.validator';

const router = Router();
router.use(requireAuth, requireRole('LANDLORD'));

router.post('/preview', validate({ body: previewBillSchema }), previewBill);
router.post('/', validate({ body: generateBillSchema }), createBill);
router.get('/', validate({ query: listBillsQuerySchema }), listBills);
router.get('/:id', validate({ params: billIdParamSchema }), getBill);
router.post(
    '/:id/paid-till',
    validate({ params: billIdParamSchema, body: paidTillSchema }),
    paidTill,
);
router.post('/:id/mark-paid', validate({ params: billIdParamSchema }), markPaid);
router.post('/:id/rent-paid', validate({ params: billIdParamSchema }), rentPaid);

export default router;
