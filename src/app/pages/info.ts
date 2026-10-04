import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { SeoService } from '../core/seo.service';

@Component({
  selector: 'app-about',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="container prose">
      <header class="page-head"><p class="kicker">About</p><h1>Mercurial Gallery of Art</h1></header>
      <p>A hobby project for exploring European painting, sculpture and architecture by artist, period, art form, subject, school and place.</p>
      <h2>Credits</h2>
      <p>The catalogue and every image come from the wonderful
        <a href="https://www.wga.hu/" target="_blank" rel="noopener noreferrer">Web Gallery of Art</a>, which inspired this project. Images are loaded
        directly from their servers and are not stored here. We do not own them; please follow the Web Gallery of Art's terms of use.</p>
      <h2>How it is built</h2>
      <p>Angular (server-side rendered) on the front end, a Symfony + PostgreSQL JSON API behind it.</p>
      <h2>Feedback</h2>
      <p>Ideas and bug reports are very welcome – <a routerLink="/contact">get in touch</a>.</p>
    </article>`,
})
export class About {
  constructor() { inject(SeoService).set({ title: 'About & credits', path: '/about' }); }
}

@Component({
  selector: 'app-privacy',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="container prose">
      <header class="page-head"><p class="kicker">Legal</p><h1>Privacy</h1></header>
      <p><strong>Short version:</strong> there are no accounts, no advertising and no analytics or tracking cookies.</p>
      <h2>Stored on your device</h2>
      <p>Your theme choice and the artworks you save to “My gallery” are kept in your browser's local storage. They never leave your device and you can clear them at any time.</p>
      <h2>What our server records</h2>
      <p>Search terms (first page only), unexpected application errors and messages sent through the contact form are stored together with your IP address, which the server needs for rate limiting and abuse prevention. Old log entries are pruned regularly.</p>
      <h2>Third parties</h2>
      <p>Artwork images are loaded from the Web Gallery of Art (wga.hu), whose servers will see your IP address and browser details when you view them.</p>
      <h2>Contact</h2>
      <p>Questions about your data? Use the contact page.</p>
      <p class="fine">This page describes how the app is built to behave; have it reviewed before relying on it as a formal policy.</p>
    </article>`,
})
export class Privacy {
  constructor() { inject(SeoService).set({ title: 'Privacy', path: '/privacy' }); }
}

type Status = 'idle' | 'sending' | 'sent' | 'error';

@Component({
  selector: 'app-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="container prose">
      <header class="page-head"><p class="kicker">Contact</p><h1>Say hello</h1></header>
      <form (submit)="submit($event)" novalidate>
        <label>Your name
          <input name="name" maxlength="60" autocomplete="name" [value]="name()" (input)="name.set($any($event.target).value)" required />
        </label>
        <label>Message
          <textarea name="message" rows="6" maxlength="900" [value]="message()" (input)="message.set($any($event.target).value)" required></textarea>
        </label>
        <p class="fine">{{ message().length }}/900</p>
        <button class="btn" type="submit" [disabled]="status() === 'sending'">{{ status() === 'sending' ? 'Sending…' : 'Send message' }}</button>
        <p role="status" aria-live="polite" [class.ok]="status() === 'sent'" [class.bad]="status() === 'error'">{{ feedback() }}</p>
      </form>
    </div>`,
  styles: `
    form { display: grid; gap: 1rem; max-width: 36rem; } label { display: grid; gap: .35rem; font-size: .9rem; color: var(--muted); }
    input, textarea { padding: .7rem .85rem; border-radius: .6rem; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font: inherit; resize: vertical; }
    input:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: 1px; } .fine { margin: -.6rem 0 0; font-size: .8rem; color: var(--muted); text-align: right; }
    .ok { color: var(--ok); } .bad { color: var(--accent); }`,
})
export class Contact {
  private readonly api = inject(ApiService);
  protected readonly name = signal('');
  protected readonly message = signal('');
  protected readonly status = signal<Status>('idle');
  protected readonly feedback = signal('');
  protected readonly ready = computed(() => this.name().trim().length > 0 && this.message().trim().length > 0);

  constructor() {
    inject(SeoService).set({ title: 'Contact', path: '/contact' });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (!this.ready()) {
      this.status.set('error');
      this.feedback.set('Please enter your name and a message.');
      return;
    }
    this.status.set('sending');
    // The API has no dedicated contact endpoint yet, so messages go to its logger (1000 character limit).
    const value = `${this.name().trim().slice(0, 60)}: ${this.message().trim()}`;
    this.api.log('message', value).subscribe({
      next: () => {
        this.status.set('sent');
        this.feedback.set('Thank you – your message was delivered.');
        this.name.set('');
        this.message.set('');
      },
      error: (e: { userMessage?: string }) => {
        this.status.set('error');
        this.feedback.set(e.userMessage ?? 'Sorry, your message could not be sent.');
      },
    });
  }
}
