export interface Scenario {
  id: string;
  icon: string;
  text: string;
  prompt: string;
}

export const scenarios: Scenario[] = [
  {
    id: "greeting",
    icon: "hand-left-outline",
    text: "Greeting",
    prompt:
      "Let’s practice basic greetings in Japanese! How would you say hello or goodbye?",
  },
  {
    id: "weather",
    icon: "sunny-outline",
    text: "Weather",
    prompt:
      "Let’s talk about the weather in Japanese! How do you describe sunny, rainy, or snowy days?",
  },
  {
    id: "anime",
    icon: "tv-outline",
    text: "Anime",
    prompt: "Let's talk about anime in Japanese! Tell me about your favorite anime and recommendations.",
  },
  {
    id: "manga",
    icon: "book-outline",
    text: "Manga",
    prompt: "Let's talk about manga in Japanese! Tell me about your favorite manga and genres.",
  },
  {
    id: "citypop",
    icon: "musical-notes-outline",
    text: "City Pop",
    prompt: "Let's talk about City Pop in Japanese! Tell me about your favorite artists and songs.",
  },
  {
    id: "fashion",
    icon: "shirt-outline",
    text: "Fashion",
    prompt: "Let's talk about fashion in Japanese! Tell me about your favorite styles, brands, and items you're interested in lately.",
  },
  {
    id: "restaurant",
    icon: "restaurant-outline",
    text: "Restaurant",
    prompt:
      "Imagine you're at a restaurant in Japan. Let's practice how to order food and ask for the bill in Japanese!",
  },
  {
    id: "shopping",
    icon: "bag-handle-outline",
    text: "Shopping",
    prompt:
      "Let’s go shopping together! Practice asking prices and finding what you need in Japanese.",
  },
  {
    id: "travel",
    icon: "airplane-outline",
    text: "Traveling",
    prompt:
      "Let’s practice useful Japanese phrases for traveling, like checking into a hotel or asking for directions.",
  },
  {
    id: "hobby",
    icon: "happy-outline",
    text: "Hobbies",
    prompt:
      "Let’s talk about your hobbies in Japanese! What do you like to do for fun?",
  },
  {
    id: "self-introduction",
    icon: "person-circle-outline",
    text: "Introduction",
    prompt:
      "Let's practice introducing ourselves in Japanese. Share your name, where you're from, and more!",
  },
  {
    id: "directions",
    icon: "compass-outline",
    text: "Directions",
    prompt:
      "You’re lost in Japan—let’s practice asking and giving directions in Japanese!",
  },
  {
    id: "hobby-details",
    icon: "sparkles-outline",
    text: "More about Hobbies",
    prompt:
      "Let's dive deeper into your favorite hobbies in Japanese. What do you enjoy the most and why?",
  },
  {
    id: "food-drinks",
    icon: "cafe-outline",
    text: "Food and Drinks",
    prompt:
      "Let’s talk about your favorite foods and drinks in Japanese. Have you tried any Japanese dishes?",
  },
  {
    id: "school-work",
    icon: "school-outline",
    text: "School/Work",
    prompt:
      "Let’s chat about your school or job in Japanese. What’s your daily routine like?",
  },
  {
    id: "making-plans",
    icon: "calendar-outline",
    text: "Making Plans",
    prompt:
      "Let’s make plans for the weekend in Japanese! Maybe go to a movie or meet for lunch?",
  },
  {
    id: "public-transport",
    icon: "train-outline",
    text: "Public Transport",
    prompt:
      "Let’s practice using trains or buses in Japan—buying tickets, asking routes, and more!",
  },
  {
    id: "recommendations",
    icon: "bulb-outline",
    text: "Recommendations",
    prompt:
      "Let’s talk about your favorite places, movies, or restaurants in Japanese—and give each other recommendations!",
  },
];