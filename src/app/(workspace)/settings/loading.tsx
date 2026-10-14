export default function SettingsLoading() {
  return <div className="settings-module-loading" role="status" aria-label="Loading workspace settings" aria-busy="true">
    <div className="record-module-loading__heading"><i /><span /><span /></div>
    <div className="settings-module-loading__grid">{Array.from({ length: 5 }, (_, index) => <section key={index}><i /><span /><span /><div><b /><b /><b /></div></section>)}</div>
    <span className="sr-only">Workspace settings are loading. The dashboard navigation remains available.</span>
  </div>;
}
