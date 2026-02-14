import Chip from '@mui/material/Chip';
import { useMemo } from 'react';
const Chips = (params) => useMemo(() => (<>
        {params?.value?.map((item) => (<Chip key={item} label={item} style={{ margin: 2 }} size="small"/>))}
      </>), [params.value?.length ? params.value.join(',') : null]);
export default Chips;
//# sourceMappingURL=renderArrayAsChips.jsx.map