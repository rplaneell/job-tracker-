export default function Practice() {
  return (
    <>
      <div className="head">
        <div>
          <h1>Practice</h1>
          <p>Prepare for the assessments these roles use.</p>
        </div>
        <span className="lock">Stage 2</span>
      </div>
      <div className="cols2">
        <section className="panel note">
          <h2>Case interviews</h2>
          <p>Timed cases by type, with written feedback on your structure and your maths.</p>
          <ul>
            <li>Market entry, profitability, pricing and market sizing</li>
            <li>Health and life science cases</li>
            <li>Session history and weak spots</li>
          </ul>
        </section>
        <section className="panel note">
          <h2>Numerical tests</h2>
          <p>Timed sets in the style of graduate assessments, scored exactly.</p>
          <ul>
            <li>Tables, charts, percentages and ratios</li>
            <li>Speed and accuracy over time</li>
            <li>Link each role to the test its company uses</li>
          </ul>
        </section>
      </div>
    </>
  );
}
