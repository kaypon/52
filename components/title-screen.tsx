import Link from "next/link";

export function TitleScreen() {
  return (
    <div className="title-screen" data-testid="title-screen">
      <h1 className="title-logo">52!</h1>
      <div className="title-suits" aria-hidden="true">
        <span className="suit-s">♠</span>
        <span className="suit-h">♥</span>
        <span className="suit-d">♦</span>
        <span className="suit-c">♣</span>
      </div>
      <p className="title-tagline">
        Shuffle a deck into an order that has almost certainly never existed before in human history.
      </p>
      <Link className="press-start" href="/52">
        Press Start
      </Link>
    </div>
  );
}
