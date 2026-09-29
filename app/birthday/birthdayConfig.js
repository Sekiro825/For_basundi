// Everything personal about the birthday surprise lives here.
// Edit the words freely — the animations adapt to whatever you write.

const name = 'Parshvi';

// Her photos are private: they live in /private (gitignored) and are served by
// app/birthday/media/[...file]/route.js only to logged-in visitors.
const photo = (id) => `/birthday/media/photos/thumb/${id}.jpg`;

export const birthday = {
  name,
  nameSyllables: ['Parsh', 'vi'], // sung as "Happy birthday dear Parsh-vi"
  from: 'Saket',
  month: 9, // September
  day: 30,

  // The countdown gate only shows when the birthday is this close.
  // Outside the window (e.g. months later) the surprise is simply open.
  countdownWindowDays: 45,

  candles: 5,

  // Her photo in the story (chat avatar + the big reveal). Empty = a pink rose.
  portrait: '/birthday/media/photos/portrait-parshvi.jpg',

  // Scene 2 — adapted from faahim/happy-birthday (MIT, see LICENSES.md)
  story: {
    greeting: 'Hey',
    greetingText: 'I really like your name btw! It sounds like a song I never want to stop humming.',
    itsYourBirthday: "It's your birthday!!! :D",
    chat: `Happy birthday ${name}!! Many many happy returns of the day 🎂🎉`,
    sendLabel: 'Send',
    idea1: "That's what I was going to send.",
    idea2: 'But then I stopped.',
    idea3: 'I realised, I wanted to do something',
    idea3Strong: 'special',
    idea4: 'Because,',
    idea5: 'You are Special',
    bigText: ['S', 'O'],
    wishHeading: 'Happy Birthday!',
    wishText: 'May every wish you make tonight find its way to you.',
    outro: 'But first… someone has a cake waiting for you.',
    outroButton: 'Take me to my cake 🎂',
  },

  cake: {
    singIntro: "Let's sing first 🎶",
    wishPrompt: 'Close your eyes… make a wish…',
    blowPrompt: '…and blow! 🌬️',
    doneTitle: 'Yayyy! 🎉',
    doneText: 'Your wish is on its way ✨',
    doneButton: "There's more for you",
  },

  orbit: {
    title: 'Another trip around the sun',
    stats: [
      { value: 365, label: 'days' },
      { value: 8760, label: 'hours' },
      { value: 525600, label: 'minutes' },
    ],
    closing: '…and every single one of them is better with you in it.',
  },

  // She loves every kind of rose, except red ones.
  roses: {
    kicker: 'your favourite flowers',
    title: 'Every rose, except red',
    subtitle: 'Red roses are for everyone. You were never "everyone".',
    list: [
      { tone: 'pink', name: 'Pink', meaning: 'for the soft way you make everything around you gentler' },
      { tone: 'peach', name: 'Peach', meaning: 'for every thank-you I never say enough' },
      { tone: 'yellow', name: 'Yellow', meaning: 'for the sunshine you bring into the most ordinary days' },
      { tone: 'white', name: 'White', meaning: 'for new beginnings, and this brand new year of yours' },
      { tone: 'lavender', name: 'Lavender', meaning: 'for a little magic, always' },
      { tone: 'orange', name: 'Orange', meaning: 'for your spark, your fire, your laugh' },
    ],
    closing: 'A whole garden for you, and not a single red one.',
  },

  // The polaroid strip. The full album lives at /birthday/memories.
  // Leave the list empty and this section simply doesn't appear.
  memoriesTitle: 'Our little moments',
  memoriesSubtitle: 'a few pages from our story so far',
  memories: [
    { src: photo('us-07-22-023'), caption: 'movie night, the first of many', date: '22 Jul 2026' },
    { src: photo('us-07-22-028'), caption: 'you, me & a mall ceiling', date: '22 Jul 2026' },
    { src: photo('us-08-04-034'), caption: 'smiling for no reason (it was you)', date: '4 Aug 2026' },
    { src: photo('us-08-04-037'), caption: '3D glasses, zero regrets', date: '4 Aug 2026' },
    { src: photo('us-08-04-046'), caption: 'PVR, again', date: '4 Aug 2026' },
    { src: photo('us-08-13-052'), caption: 'the laziest, best afternoon', date: '13 Aug 2026' },
    { src: photo('us-08-21-066'), caption: 'missed half the movie', date: '21 Aug 2026' },
    { src: photo('us-08-21-136'), caption: 'us, a little sideways', date: '21 Aug 2026' },
    { src: photo('us-09-18-074'), caption: 'our temple visit', date: '18 Sep 2026' },
    { src: photo('us-09-23-085'), caption: 'a pink rose in your hair', date: '23 Sep 2026' },
    { src: photo('us-09-23-090'), caption: 'one on the cheek', date: '23 Sep 2026' },
  ],

  reasonsTitle: 'Reasons you are my favourite',
  // Each reason comes with a little photo of her pinned to the card.
  reasons: [
    { text: 'You make ordinary days feel like chapters worth rereading.', photo: photo('her-09-23-079') },
    { text: 'Your laugh fixes my worst days in about three seconds.', photo: photo('calls-08-11-108') },
    { text: 'You feel like home.', photo: photo('her-09-27-017') },
    { text: "You're kind in the quiet ways nobody notices. I notice.", photo: photo('her-09-19-008') },
    { text: 'You make me want to be a better version of me.', photo: photo('her-09-20-013') },
    { text: `Every plan sounds better when it ends with "…and ${name} is coming."`, photo: photo('her-08-04-036') },
    { text: "You're my favourite notification.", photo: photo('calls-09-14-121') },
    { text: 'The way you care about the people you love, fiercely.', photo: photo('her-09-20-016') },
    { text: 'You love every rose except the red ones, and somehow that is the most you thing ever.', photo: photo('her-09-23-088') },
    { text: "Because you're you, and honestly that's the whole list.", photo: photo('her-09-23-094') },
  ],

  letter: {
    greeting: `Dear ${name},`,
    paragraphs: [
      'Happy birthday! Today the world celebrates the day it got a little brighter, and I get to celebrate you.',
      'I built this little corner of the internet for you because words on a screen never feel like enough. I wanted you to have something you could open, play with, and come back to whenever you need a smile.',
      'Thank you for your patience, your laugh, and your stubborn kindness, on the easy days and the hard ones.',
      "This year, I hope you get everything you've been quietly wishing for. And if the universe needs any help delivering it, I'm right here.",
      'Happy birthday, once more. This one is all yours.',
    ],
    signoff: 'With all my love,',
    // A photo of us, tucked into the corner of the letter.
    photo: { src: photo('us-09-18-075'), caption: 'us ♡' },
  },

  finale: {
    title: "Here's to your best year yet",
    bouquetCaption: 'a bouquet for you: every colour, except red',
    wishPrompt: 'One more wish, just for you',
    wishPlaceholder: 'Write a wish for this year…',
    wishButton: 'Release the lantern',
    wishDone: 'Your wish is written in the stars now ✨',
    replay: 'Watch it again',
    photo: { src: photo('us-08-04-048'), alt: `${name} and Saket` },
  },
};
