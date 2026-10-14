export default function WorkspaceLoading() {
  return <div className="record-module-loading" role="status" aria-label="Loading workspace records" aria-busy="true">
    <div className="record-module-loading__heading"><i /><span /><span /></div>
    <div className="record-module-loading__context" />
    <div className="record-module-loading__table">
      <div className="record-module-loading__toolbar"><i /><i /><i /></div>
      <div className="record-module-loading__columns"><i /><i /><i /><i /><i /></div>
      {Array.from({ length: 7 }, (_, index) => <div className="record-module-loading__row" key={index}><i /><i /><i /><i /><i /></div>)}
    </div>
    <span className="sr-only">Foundry records are loading. The dashboard navigation remains available.</span>
  </div>;
}
