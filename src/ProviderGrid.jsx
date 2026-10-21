import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, themeQuartz, colorSchemeDark } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function ProviderGrid({ rows, columns }) {
  const theme = useMemo(() => themeQuartz.withPart(colorSchemeDark).withParams({ backgroundColor: '#101a23', foregroundColor: '#b7c5ce', headerBackgroundColor: '#121f29', headerTextColor: '#718795', borderColor: '#22323f', rowBorder: { color: '#1c2b36' }, oddRowBackgroundColor: '#101a23', accentColor: '#b0dfca', fontFamily: 'DM Sans, system-ui, sans-serif', fontSize: 12, headerFontSize: 10, rowHeight: 52, headerHeight: 42, wrapperBorderRadius: 8 }), []);
  return <AgGridReact theme={theme} rowData={rows} columnDefs={columns} defaultColDef={{ sortable: true, resizable: true }} domLayout="autoHeight" getRowId={({ data }) => data.id} suppressCellFocus={false}/>;
}
