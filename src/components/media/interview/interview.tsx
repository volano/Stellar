import { Component, Element, State, Prop, Method, Listen, h } from '@stencil/core';
import ezClipboard from 'ez-clipboard';
import properties from 'css-custom-properties';
import {get_interview_lines, update_interview_lines} from './helpers';

@Component({
  tag: 'stellar-interview',
  styleUrl: 'interview.css'
})
export class Interview {
  @Element() element: HTMLElement;

  @State() randomId: number = Math.floor(Math.random() * 6) + 1;

  @Prop() src: string;
  @Prop() debug: boolean = false;
  @Prop() color: string = "white";
  @Prop({mutable: true}) playing: boolean = false;

  @Prop({mutable: true}) width: number = 800;
  @Prop({mutable: true}) height: number = 800;
  @Prop({mutable: true}) aspectRatio: number = 100;

  @Prop({mutable: true}) visualization: "circle"|"bars"|"wave"|"bars2" = "bars2";

  @State() audio: HTMLWebAudioElement;
  @State() audio_source: HTMLWebAudioSourceElement;
  @State() io: IntersectionObserver;

  @State() loaded: boolean = false;
  @State() loading: boolean = false;

  @State() updateFunc: Function;

  @State() duration: number = 0;
  @State() current: number = 0;

  @State() interviewLines: any;

  componentWillLoad() {
    properties.set({
      "--width": `${this.width}px`,
      "--height": `${this.height}px`,
      "--aspectRatio": `${this.aspectRatio}%`
    }, this.element);
  }

  async componentDidLoad() {
    if (!this.interviewLines) {
      this.interviewLines = get_interview_lines(this.element)
    }

    update_interview_lines(this.interviewLines, this.cache, this.time)
    this.audio = this.element.querySelector('web-audio');
    this.audio_source = await this.audio.source("interview")
    this.addIntersectionObserver();
  }

  addIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver((data: any) => {
        // because there will only ever be one instance
        // of the element we are observing
        // we can just use data[0]
        if (data[0].isIntersecting) {
          // this.handleInScreen();
        } else {
          this.handleOffScreen();
        }
      }, {
        threshold: [0]
      })

      this.io.observe(this.element);
    }
  }

  cache = new WeakMap()

  @Listen('timeupdate')
  handleTimeUpdate(event) {
    this.current = Math.round(event.detail.time * 1000);
    this.duration = Math.round(event.detail.duration * 1000);

    update_interview_lines(this.interviewLines, this.cache, this.time)
  }

  get time() {
    return this.current
  }

  async handleInScreen(cb = () => {}) {
    this.loading = true;
    if (!this.loaded && !this.audio.is_prepared()) {
      await this.audio.connect_the_world();

      this.loaded = true;

      setTimeout(async () => {
        this.loading = false;

        if (!this.audio_source) {
          this.audio_source = await this.audio.source("interview")
          await this.audio_source.prepare()
        }

        const duration = await this.audio_source.getDuration()
        this.duration = Math.round(duration * 1000);
        cb()
      }, 1000)
    }
  }

  async handleOffScreen() {
    this.pause()
  }

  @Method()
  async play() {
    if (this.audio) {
      if (this.audio_source) {
        await this.audio_source.play()
        this.playing = this.audio_source.playing;
      }
    }
  }

  @Method()
  async skipTo(time: number) {
    if (this.audio) {
      if (this.audio_source) {
        await this.audio_source.skipTo(time)
        this.playing = this.audio_source.playing;
      }
    }
  }

  @Method()
  async pause() {
    if (this.audio) {
      if (this.audio_source) {
        await this.audio_source.pause()
        this.playing = this.audio_source.playing;
      }
    }
  }

  @Method()
  async toggle() {
    if (this.audio) {
      if (this.audio_source) {
        await this.audio_source.toggle()
        this.playing = this.audio_source.playing;
      }
    }
  }

  async handleClick() {
    if (!this.audio.is_prepared()) {
      await this.handleInScreen(() => {
         this.handleClick()
       });
    } else {
      await this.toggle();
    }

    if (this.current === this.duration) {
      await this.skipTo(0)
    }
  }

  handleCurrentClick() {
    ezClipboard.copyPlain(this.current);
  }

  render () {
    return (
      <div class="card" onDblClick={() => { this.handleClick() }}>
        <section>
          <slot />
          <div class="transcript">
            <slot name="transcript"></slot>
          </div>
          <web-audio name={`interview-${this.randomId}`}>
            <web-audio-source src={this.src} name="interview"></web-audio-source>
          </web-audio>
          { this.debug && <web-audio-debugger /> }
          <web-audio-visualizer for={`interview-${this.randomId}`} type={this.visualization} width="1024" height="1024" color={this.color} />
          <button class={this.loading ? "loading button" : (this.playing ? "playing button" : "button")} onClick={() => { this.handleClick() }}>
            <stellar-asset name={this.loading ? "sync" : (this.playing ? "pause" : "play")} class={this.loading ? "animation-spin" : ""} />
          </button>
          <h3>
            <stellar-unit class="current" value={this.current} from="ms" to="s" onClick={() => { this.handleCurrentClick() }} />
          </h3>
          <h3>
            <stellar-unit class="duration" value={this.duration} from="ms" to="s" />
          </h3>
          <stellar-progress value={this.current} max={this.duration} noease={true} blurable={false} slender={true} editable={true} onValueChange={(e) => { this.skipTo(e.detail.value) }} />
        </section>
      </div>
    )
  }
}
