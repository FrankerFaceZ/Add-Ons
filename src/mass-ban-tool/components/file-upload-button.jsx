import { BUTTON_CLASS } from '../utils/constants/css-classes';

const { createElement } = FrankerFaceZ.utilities.dom;

export const FILE_UPLOAD_BUTTON = (
    <button type="button" class={BUTTON_CLASS + ' ffz-mmu-file-upload'}>
        <span class="tw-button__icon tw-button__icon--left ffz-i-upload"></span>
        <span class="tw-button__text">Select File</span>
    </button>
);
