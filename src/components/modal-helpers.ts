import { ref } from 'vue';

import type VfModal from './vf-modal.vue';

export function vfModalRef() {
    return ref<InstanceType<typeof VfModal>>();
}
