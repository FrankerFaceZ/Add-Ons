import { BUTTON_CLASS } from '../utils/constants/css-classes';

const { createElement } = FrankerFaceZ.utilities.dom;

export const EXPORT_BUTTONS = {
    csv: (
        <button type="button" class={BUTTON_CLASS + ' ffz-mmu-file-export'}>
            <span class="tw-button__icon tw-button__icon--left ffz-i-download"></span>
            <span class="tw-button__text">CSV</span>
        </button>
    ),
    txt: (
        <button type="button" class={BUTTON_CLASS + ' ffz-mmu-file-export'}>
            <span class="tw-button__icon tw-button__icon--left ffz-i-download"></span>
            <span class="tw-button__text">TXT</span>
        </button>
    )
};
