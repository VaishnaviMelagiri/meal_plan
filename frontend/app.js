


/**
 * Personalized Meal Plan Generator by IOM Bioworks
 */

// ═══ Config ═══
const API_URL = 'https://ax72uksye8.execute-api.us-east-1.amazonaws.com/prod';

const $ = id => document.getElementById(id);

let currentDay = 'day_1';
let mealPlanData = null;
let swapTarget = null;
let patientProfile = null;

// ═══ Ingredient → Dishes Map (yes-list driven, variety per meal type) ═══
// Each yes-list ingredient maps to multiple dishes per meal time
// so the user sees different preparations of the same beneficial ingredient
const INGREDIENT_DISH_MAP = {
    // OATS — Faecalibacterium, gut fibre
    'oats': {
        label: 'Oats (Gut Fibre)',
        breakfast: [
            { name: 'Oats Porridge with Banana & Jaggery', ings: 'Rolled oats, banana, jaggery, cinnamon, milk', cal: 280, pro: 8, carb: 48, fat: 5 },
            { name: 'Oats Upma', ings: 'Rolled oats, onion, mustard seeds, curry leaves, green chilli', cal: 230, pro: 7, carb: 38, fat: 6 },
            { name: 'Oats Idli', ings: 'Oats, curd, eno, ginger, coriander', cal: 210, pro: 8, carb: 34, fat: 4 },
        ],
        snack: [
            { name: 'Banana Oats Smoothie', ings: 'Banana, oats, honey, curd, cardamom', cal: 220, pro: 6, carb: 40, fat: 4 },
            { name: 'Oats Energy Bar', ings: 'Oats, jaggery, peanuts, sesame seeds, ghee', cal: 250, pro: 7, carb: 36, fat: 9 },
        ],
        dinner: [
            { name: 'Oats Khichdi', ings: 'Oats, moong dal, ghee, cumin, turmeric, vegetables', cal: 310, pro: 12, carb: 48, fat: 7 },
            { name: 'Oats Vegetable Soup', ings: 'Oats, carrot, beans, garlic, pepper, broth', cal: 180, pro: 6, carb: 28, fat: 4 },
        ],
    },
    // RAGI (Finger Millet) — Faecalibacterium, calcium
    'ragi': {
        label: 'Ragi / Finger Millet',
        breakfast: [
            { name: 'Ragi Dosa with Coconut Chutney', ings: 'Ragi flour, rice flour, onion, cumin, coconut chutney', cal: 220, pro: 6, carb: 38, fat: 4 },
            { name: 'Ragi Porridge (Ambil)', ings: 'Ragi flour, buttermilk, salt, cumin', cal: 180, pro: 5, carb: 34, fat: 2 },
            { name: 'Ragi Idli', ings: 'Ragi, urad dal, rice, salt', cal: 200, pro: 7, carb: 36, fat: 2 },
        ],
        snack: [
            { name: 'Ragi Ladoo', ings: 'Roasted ragi, jaggery, ghee, cardamom', cal: 210, pro: 4, carb: 34, fat: 8 },
            { name: 'Ragi Malt with Jaggery', ings: 'Ragi flour, milk, jaggery, cardamom', cal: 190, pro: 7, carb: 30, fat: 4 },
        ],
        lunch: [
            { name: 'Ragi Roti with Dal', ings: 'Ragi flour, water, toor dal, ghee, curry leaves', cal: 320, pro: 11, carb: 50, fat: 6 },
        ],
        dinner: [
            { name: 'Ragi Mudde with Sambhar', ings: 'Ragi flour ball, mixed vegetable sambhar', cal: 300, pro: 10, carb: 52, fat: 4 },
            { name: 'Ragi Chapati with Sabzi', ings: 'Ragi flour, wheat flour, ghee, seasonal vegetable', cal: 280, pro: 8, carb: 44, fat: 7 },
        ],
    },
    // WHOLE WHEAT — Faecalibacterium, dietary fibre
    'whole wheat': {
        label: 'Whole Wheat',
        breakfast: [
            { name: 'Whole Wheat Paratha with Curd', ings: 'Whole wheat flour, ghee, fresh curd', cal: 300, pro: 9, carb: 40, fat: 10 },
            { name: 'Wheat Dalia Porridge', ings: 'Broken wheat, milk, jaggery, cardamom, nuts', cal: 260, pro: 8, carb: 42, fat: 6 },
            { name: 'Wheat Rava Upma', ings: 'Wheat rava, mustard, curry leaves, vegetables', cal: 230, pro: 6, carb: 38, fat: 5 },
        ],
        lunch: [
            { name: 'Whole Wheat Roti with Palak Dal', ings: 'Whole wheat roti, moong dal, spinach, ghee', cal: 350, pro: 14, carb: 48, fat: 8 },
            { name: 'Wheat Pulao', ings: 'Broken wheat, mixed vegetables, biryani masala', cal: 310, pro: 9, carb: 50, fat: 6 },
            { name: 'Chapati with Rajma', ings: 'Wheat chapati, kidney beans, onion, tomato', cal: 370, pro: 14, carb: 52, fat: 7 },
        ],
        snack: [
            { name: 'Wheat Toast with Peanut Butter', ings: 'Whole wheat bread, homemade peanut butter', cal: 200, pro: 8, carb: 24, fat: 9 },
        ],
        dinner: [
            { name: 'Wheat Dalia Khichdi', ings: 'Broken wheat, moong dal, vegetables, ghee, cumin', cal: 280, pro: 10, carb: 44, fat: 6 },
            { name: 'Pumpkin Soup with Wheat Toast', ings: 'Pumpkin, onion, garlic, wheat toast', cal: 210, pro: 5, carb: 34, fat: 5 },
        ],
    },
    // MOONG DAL — Bifidobacterium, protein
    'moong': {
        label: 'Moong Dal (Protein)',
        breakfast: [
            { name: 'Moong Dal Cheela', ings: 'Moong dal batter, onion, green chilli, coriander, ginger', cal: 200, pro: 12, carb: 28, fat: 4 },
            { name: 'Pesarattu (Green Gram Dosa)', ings: 'Whole green moong, rice, ginger, cumin, onion', cal: 210, pro: 10, carb: 32, fat: 4 },
        ],
        snack: [
            { name: 'Moong Sprouts Chaat', ings: 'Moong sprouts, onion, tomato, lemon, chaat masala', cal: 150, pro: 10, carb: 22, fat: 2 },
            { name: 'Moong Dal Soup', ings: 'Moong dal, garlic, ginger, cumin, lemon', cal: 160, pro: 10, carb: 20, fat: 3 },
        ],
        lunch: [
            { name: 'Moong Dal with Brown Rice', ings: 'Moong dal, brown rice, ghee, garlic, turmeric', cal: 350, pro: 14, carb: 54, fat: 7 },
            { name: 'Moong Dal Khichdi', ings: 'Moong dal, rice, ghee, cumin, turmeric, vegetables', cal: 320, pro: 12, carb: 50, fat: 6 },
        ],
        dinner: [
            { name: 'Moong Dal Khichdi with Ghee', ings: 'Rice, moong dal, ghee, turmeric, cumin, vegetables', cal: 320, pro: 12, carb: 50, fat: 7 },
            { name: 'Moong Dal Halwa (light)', ings: 'Moong dal, jaggery, ghee, cardamom', cal: 250, pro: 8, carb: 36, fat: 9 },
        ],
    },
    // FLAXSEED — Faecalibacterium, omega-3
    'flaxseed': {
        label: 'Flaxseed (Omega-3)',
        breakfast: [
            { name: 'Flaxseed Banana Smoothie', ings: 'Banana, flaxseed powder, curd, honey', cal: 220, pro: 7, carb: 36, fat: 6 },
            { name: 'Flaxseed Chilla', ings: 'Wheat flour, flaxseed, onion, green chilli', cal: 210, pro: 8, carb: 30, fat: 6 },
        ],
        snack: [
            { name: 'Flaxseed Raita', ings: 'Curd, flaxseed powder, cumin, salt, mint', cal: 120, pro: 6, carb: 8, fat: 6 },
            { name: 'Flaxseed Ladoo', ings: 'Roasted flaxseed, jaggery, sesame, ghee', cal: 200, pro: 5, carb: 22, fat: 11 },
        ],
        lunch: [
            { name: 'Flaxseed Roti with Dal', ings: 'Wheat + flaxseed flour roti, toor dal, ghee', cal: 340, pro: 12, carb: 48, fat: 9 },
        ],
        dinner: [
            { name: 'Flaxseed Vegetable Curry', ings: 'Mixed vegetables, flaxseed powder, onion, tomato', cal: 240, pro: 8, carb: 30, fat: 9 },
        ],
    },
    // CURD / FERMENTED FOODS — Bifidobacterium, Lactobacillus
    'curd': {
        label: 'Curd / Fermented Foods',
        breakfast: [
            { name: 'Curd with Poha', ings: 'Pressed rice, curd, mustard, curry leaves, pomegranate', cal: 260, pro: 8, carb: 42, fat: 5 },
            { name: 'Lassi with Oats', ings: 'Curd, oats, honey, cardamom', cal: 220, pro: 8, carb: 34, fat: 5 },
        ],
        snack: [
            { name: 'Buttermilk (Chaas)', ings: 'Curd, water, cumin, mint, salt', cal: 60, pro: 3, carb: 5, fat: 2 },
            { name: 'Sweet Lassi', ings: 'Curd, sugar, cardamom, rose water', cal: 150, pro: 5, carb: 22, fat: 4 },
            { name: 'Dahi Vada', ings: 'Urad dal vada, curd, tamarind, cumin', cal: 220, pro: 8, carb: 28, fat: 8 },
        ],
        lunch: [
            { name: 'Curd Rice with Pickle', ings: 'Cooked rice, fresh curd, pomegranate, mustard', cal: 280, pro: 8, carb: 45, fat: 6 },
            { name: 'Curd Pulao', ings: 'Rice, curd, mint, vegetables, cumin', cal: 300, pro: 9, carb: 48, fat: 6 },
        ],
        dinner: [
            { name: 'Fermented Rice with Pickle', ings: 'Leftover rice, water, curd, mango pickle', cal: 220, pro: 5, carb: 42, fat: 3 },
            { name: 'Chapati with Curd Curry', ings: 'Wheat chapati, curd gravy, besan, cumin', cal: 310, pro: 10, carb: 44, fat: 8 },
        ],
    },
    // RAJMA / KIDNEY BEANS — Anaerostipes
    'rajma': {
        label: 'Rajma / Kidney Beans',
        lunch: [
            { name: 'Rajma Chawal', ings: 'Kidney beans, rice, onion, tomato, garam masala', cal: 400, pro: 15, carb: 60, fat: 7 },
            { name: 'Rajma Roti', ings: 'Kidney beans, wheat roti, onion, spices', cal: 360, pro: 14, carb: 52, fat: 7 },
        ],
        snack: [
            { name: 'Rajma Soup', ings: 'Kidney beans, onion, garlic, tomato, pepper', cal: 180, pro: 10, carb: 24, fat: 4 },
        ],
        dinner: [
            { name: 'Chole with Kulcha', ings: 'Chickpeas, onion, tomato, wheat kulcha', cal: 400, pro: 14, carb: 56, fat: 10 },
        ],
    },
    // BAJRA (Pearl Millet) — Dialister
    'bajra': {
        label: 'Bajra / Pearl Millet',
        breakfast: [
            { name: 'Bajra Roti with Jaggery & Ghee', ings: 'Bajra flour, jaggery, ghee', cal: 260, pro: 6, carb: 42, fat: 8 },
            { name: 'Bajra Porridge', ings: 'Bajra flour, milk, jaggery, cardamom', cal: 240, pro: 7, carb: 38, fat: 6 },
        ],
        lunch: [
            { name: 'Bajra Khichdi', ings: 'Bajra, moong dal, ghee, cumin, turmeric', cal: 320, pro: 11, carb: 48, fat: 7 },
            { name: 'Bajra Roti with Brinjal Bharta', ings: 'Bajra roti, roasted brinjal, onion, garlic', cal: 300, pro: 8, carb: 46, fat: 7 },
        ],
        dinner: [
            { name: 'Bajra Roti with Mixed Veg Curry', ings: 'Bajra roti, seasonal vegetables, spices', cal: 300, pro: 8, carb: 46, fat: 7 },
        ],
    },
    // BANANA — Anaerostipes, prebiotic
    'banana': {
        label: 'Banana (Prebiotic)',
        breakfast: [
            { name: 'Banana Pancake', ings: 'Ripe banana, oats flour, cinnamon, honey', cal: 240, pro: 6, carb: 44, fat: 4 },
            { name: 'Banana Smoothie Bowl', ings: 'Banana, curd, honey, flaxseed, fruits', cal: 260, pro: 8, carb: 42, fat: 5 },
        ],
        snack: [
            { name: 'Banana with Peanut Butter', ings: 'Ripe banana, homemade peanut butter', cal: 200, pro: 6, carb: 30, fat: 8 },
            { name: 'Banana Stem Juice', ings: 'Banana stem, lemon, ginger, salt', cal: 40, pro: 1, carb: 8, fat: 0 },
        ],
        lunch: [
            { name: 'Raw Banana Curry with Rice', ings: 'Raw banana, coconut, mustard, rice', cal: 320, pro: 7, carb: 55, fat: 6 },
        ],
        dinner: [
            { name: 'Banana Stem Sabzi', ings: 'Banana stem, coconut, mustard seeds, curry leaves', cal: 130, pro: 3, carb: 20, fat: 5 },
        ],
    },
    // DEFAULT (when patient data has no specific match)
    '_default': {
        label: 'Gut Health Classics',
        breakfast: [
            { name: 'Idli with Sambhar', ings: 'Rice idli (120g), toor dal sambhar (150ml), vegetables (60g)', cal: 230, pro: 8, carb: 42, fat: 3 },
            { name: 'Poha with Peanuts', ings: 'Pressed rice (70g), peanuts (20g), turmeric (1g), curry leaves (3g), lemon juice (10ml)', cal: 250, pro: 7, carb: 38, fat: 8 },
            { name: 'Upma with Coconut Chutney', ings: 'Semolina (60g), onion (40g), mustard seeds (2g), oil (5ml), coconut chutney (40g)', cal: 260, pro: 7, carb: 40, fat: 7 },
            { name: 'Vermicelli Upma', ings: 'Wheat vermicelli (70g), onion (40g), tomato (30g), oil (5ml), curry leaves (3g)', cal: 245, pro: 6, carb: 42, fat: 6 },
        ],
        snack: [
            { name: 'Roasted Chana', ings: 'Roasted chickpeas (50g), lemon juice (5ml), chaat masala (2g)', cal: 160, pro: 9, carb: 24, fat: 4 },
            { name: 'Fruit Chaat', ings: 'Apple (80g), guava (60g), pomegranate (30g), chaat masala (2g), lemon juice (5ml)', cal: 120, pro: 2, carb: 28, fat: 1 },
            { name: 'Makhana (Fox Nuts)', ings: 'Makhana (30g), ghee (3g), rock salt (1g), black pepper (1g)', cal: 110, pro: 4, carb: 20, fat: 2 },
            { name: 'Dhokla', ings: 'Besan (50g), curd (30g), eno (3g), mustard seeds (2g), oil (3ml)', cal: 150, pro: 7, carb: 22, fat: 4 },
        ],
        lunch: [
            { name: 'Dal Tadka with Brown Rice', ings: 'Toor dal (60g), garlic (5g), cumin (2g), ghee (5g), brown rice (90g)', cal: 380, pro: 14, carb: 58, fat: 8 },
            { name: 'Sambhar Rice', ings: 'Rice (90g), mixed veg sambhar (200ml), coconut chutney (40g)', cal: 340, pro: 10, carb: 54, fat: 6 },
            { name: 'Vegetable Biryani', ings: 'Basmati rice (90g), mixed vegetables (100g), biryani masala (5g), ghee (5g)', cal: 340, pro: 9, carb: 55, fat: 8 },
            { name: 'Millet Pulao', ings: 'Foxtail millet (80g), mixed vegetables (100g), cumin (2g), ghee (5g)', cal: 310, pro: 9, carb: 50, fat: 7 },
        ],
        dinner: [
            { name: 'Moong Dal Khichdi', ings: 'Rice (70g), moong dal (50g), ghee (5g), turmeric (1g), cumin (2g)', cal: 320, pro: 12, carb: 50, fat: 7 },
            { name: 'Masoor Dal with Chapati', ings: 'Masoor dal (60g), wheat chapati (80g), ghee (5g), lemon juice (5ml)', cal: 340, pro: 13, carb: 50, fat: 7 },
            { name: 'Vegetable Soup with Toast', ings: 'Mixed vegetables (200g), vegetable broth (200ml), whole wheat toast (60g), black pepper (2g)', cal: 200, pro: 6, carb: 30, fat: 4 },
            { name: 'Palak Paneer with Roti', ings: 'Spinach (100g), paneer (60g), wheat roti (80g), onion (40g), oil (5ml)', cal: 370, pro: 17, carb: 38, fat: 16 },
        ],
    },
    // BROWN RICE — Ruminococcus, slow-release carbs
    'brown rice': {
        label: 'Brown Rice (Slow Carbs)',
        breakfast: [
            { name: 'Brown Rice Porridge', ings: 'Brown rice (60g), milk (150ml), jaggery (15g), cardamom (1g)', cal: 250, pro: 7, carb: 44, fat: 4 },
        ],
        lunch: [
            { name: 'Brown Rice with Dal Fry', ings: 'Brown rice (90g), toor dal (60g), ghee (5g), cumin (2g), turmeric (1g)', cal: 370, pro: 13, carb: 58, fat: 7 },
            { name: 'Brown Rice Vegetable Pulao', ings: 'Brown rice (90g), mixed vegetables (100g), cumin (2g), ghee (5g), bay leaf (1g)', cal: 330, pro: 8, carb: 54, fat: 7 },
            { name: 'Curd Rice with Brown Rice', ings: 'Brown rice (100g), curd (100g), mustard (2g), curry leaves (3g), pomegranate (20g)', cal: 300, pro: 9, carb: 48, fat: 6 },
        ],
        dinner: [
            { name: 'Brown Rice Khichdi', ings: 'Brown rice (80g), moong dal (50g), ghee (5g), vegetables (80g), turmeric (1g)', cal: 330, pro: 13, carb: 52, fat: 7 },
            { name: 'Brown Rice Sambhar Bowl', ings: 'Brown rice (90g), sambhar (200ml), coconut chutney (30g)', cal: 340, pro: 11, carb: 54, fat: 6 },
        ],
    },
    // SPINACH — Folate, iron, alkalising
    'spinach': {
        label: 'Spinach / Palak (Iron & Folate)',
        breakfast: [
            { name: 'Palak Paratha with Curd', ings: 'Whole wheat flour (80g), spinach (60g), ghee (5g), cumin (2g), curd (80g)', cal: 290, pro: 10, carb: 40, fat: 9 },
            { name: 'Spinach Besan Cheela', ings: 'Besan (60g), spinach (50g), onion (30g), green chilli (3g), oil (3ml)', cal: 210, pro: 11, carb: 26, fat: 6 },
        ],
        snack: [
            { name: 'Palak Soup', ings: 'Spinach (100g), onion (30g), garlic (5g), black pepper (2g), cream (15ml)', cal: 90, pro: 4, carb: 8, fat: 4 },
            { name: 'Spinach Corn Sandwich', ings: 'Whole wheat bread (60g), spinach (40g), corn (30g), cheese (15g)', cal: 200, pro: 8, carb: 28, fat: 6 },
        ],
        lunch: [
            { name: 'Palak Dal with Roti', ings: 'Toor dal (60g), spinach (80g), wheat roti (80g), ghee (5g)', cal: 340, pro: 14, carb: 48, fat: 7 },
            { name: 'Palak Paneer with Roti', ings: 'Spinach (100g), paneer (60g), wheat roti (80g), onion (40g), oil (5ml)', cal: 370, pro: 17, carb: 38, fat: 16 },
            { name: 'Green Moong Palak Khichdi', ings: 'Green moong (60g), rice (70g), spinach (60g), ghee (5g), garlic (5g)', cal: 320, pro: 13, carb: 50, fat: 7 },
        ],
        dinner: [
            { name: 'Palak Khichdi', ings: 'Rice (70g), moong dal (40g), spinach (80g), ghee (5g), turmeric (1g)', cal: 305, pro: 12, carb: 46, fat: 7 },
            { name: 'Spinach Soup with Garlic Toast', ings: 'Spinach (150g), garlic (5g), onion (40g), whole wheat toast (60g)', cal: 190, pro: 7, carb: 28, fat: 5 },
        ],
    },
    // SWEET POTATO — Bifidobacterium, resistant starch
    'sweet potato': {
        label: 'Sweet Potato (Resistant Starch)',
        breakfast: [
            { name: 'Sweet Potato Paratha', ings: 'Sweet potato (100g), whole wheat flour (70g), ghee (5g), cumin (2g)', cal: 295, pro: 7, carb: 50, fat: 6 },
            { name: 'Sweet Potato Smoothie Bowl', ings: 'Sweet potato (100g), banana (80g), curd (100g), honey (10g), flaxseed (10g)', cal: 270, pro: 8, carb: 46, fat: 5 },
        ],
        snack: [
            { name: 'Roasted Sweet Potato Chaat', ings: 'Sweet potato (150g), cumin powder (2g), lemon juice (10ml), chaat masala (2g)', cal: 160, pro: 3, carb: 36, fat: 1 },
            { name: 'Sweet Potato Tikki', ings: 'Sweet potato (150g), onion (30g), coriander (5g), besan (20g), oil (5ml)', cal: 195, pro: 5, carb: 38, fat: 4 },
        ],
        lunch: [
            { name: 'Sweet Potato & Chickpea Curry', ings: 'Sweet potato (150g), chickpeas (80g), tomato (50g), spices (5g), oil (5ml)', cal: 330, pro: 12, carb: 55, fat: 7 },
            { name: 'Sweet Potato Roti with Dal', ings: 'Sweet potato (100g), wheat flour (60g), moong dal (60g), ghee (5g)', cal: 350, pro: 13, carb: 56, fat: 7 },
        ],
        dinner: [
            { name: 'Sweet Potato Sabzi with Chapati', ings: 'Sweet potato (150g), onion (50g), mustard seeds (2g), wheat chapati (80g), oil (5ml)', cal: 310, pro: 7, carb: 52, fat: 7 },
            { name: 'Sweet Potato Soup', ings: 'Sweet potato (200g), onion (40g), garlic (5g), ginger (5g), black pepper (2g)', cal: 170, pro: 4, carb: 36, fat: 2 },
        ],
    },
    // JOWAR (Sorghum) — gut-friendly fibre
    'jowar': {
        label: 'Jowar / Sorghum (Gut Fibre)',
        breakfast: [
            { name: 'Jowar Dosa with Chutney', ings: 'Jowar flour (70g), rice flour (20g), cumin (2g), onion (30g), coconut chutney (40g)', cal: 220, pro: 6, carb: 38, fat: 4 },
            { name: 'Jowar Porridge', ings: 'Jowar flour (60g), milk (150ml), jaggery (15g), cardamom (1g)', cal: 230, pro: 7, carb: 38, fat: 4 },
        ],
        snack: [
            { name: 'Jowar Puffs Chaat', ings: 'Jowar puffs (30g), onion (20g), tomato (20g), lemon juice (5ml), chaat masala (2g)', cal: 110, pro: 3, carb: 20, fat: 2 },
        ],
        lunch: [
            { name: 'Jowar Roti with Vegetables', ings: 'Jowar flour (80g), seasonal vegetables (120g), onion (50g), oil (5ml)', cal: 300, pro: 8, carb: 48, fat: 6 },
            { name: 'Jowar Khichdi', ings: 'Jowar (80g), moong dal (50g), ghee (5g), cumin (2g), turmeric (1g)', cal: 315, pro: 12, carb: 48, fat: 7 },
        ],
        dinner: [
            { name: 'Jowar Roti with Dal', ings: 'Jowar roti (80g), toor dal (60g), ghee (5g), garlic (5g)', cal: 305, pro: 11, carb: 46, fat: 7 },
        ],
    },
};

// Keywords from the patient's report that map to our ingredient keys
const INGREDIENT_KEYWORDS = [
    { keys: ['oat', 'oats', 'rolled oat'], mapTo: 'oats' },
    { keys: ['ragi', 'finger millet', 'nachni'], mapTo: 'ragi' },
    { keys: ['whole wheat', 'wheat', 'atta', 'chapati', 'roti'], mapTo: 'whole wheat' },
    { keys: ['moong', 'green gram', 'mung'], mapTo: 'moong' },
    { keys: ['flaxseed', 'flax seed', 'linseed', 'alsi'], mapTo: 'flaxseed' },
    { keys: ['curd', 'dahi', 'yogurt', 'fermented', 'probiotic'], mapTo: 'curd' },
    { keys: ['rajma', 'kidney bean'], mapTo: 'rajma' },
    { keys: ['bajra', 'pearl millet'], mapTo: 'bajra' },
    { keys: ['banana', 'kela'], mapTo: 'banana' },
    { keys: ['brown rice', 'brown rice'], mapTo: 'brown rice' },
    { keys: ['spinach', 'palak'], mapTo: 'spinach' },
    { keys: ['sweet potato', 'shakarkand'], mapTo: 'sweet potato' },
    { keys: ['jowar', 'sorghum'], mapTo: 'jowar' },
];

// Bacteria name → which ingredients to suggest (based on which bacteria each food supports)
const BACTERIA_TO_INGREDIENTS = {
    'Faecalibacterium': ['oats', 'ragi', 'whole wheat', 'flaxseed', 'banana', 'jowar'],
    'Faecalibacterium prausnitzii': ['oats', 'ragi', 'whole wheat', 'flaxseed', 'brown rice'],
    'Bifidobacterium': ['curd', 'moong', 'oats', 'banana', 'sweet potato'],
    'Lactobacillus': ['curd', 'flaxseed', 'moong', 'spinach'],
    'Bacteroides': ['moong', 'whole wheat', 'curd', 'bajra', 'brown rice'],
    'Dialister': ['bajra', 'ragi', 'whole wheat', 'jowar'],
    'Anaerostipes': ['banana', 'rajma', 'oats', 'sweet potato'],
    'Roseburia': ['oats', 'whole wheat', 'ragi', 'jowar'],
    'Akkermansia': ['curd', 'flaxseed', 'oats', 'sweet potato'],
    'Ruminococcus': ['oats', 'whole wheat', 'ragi', 'brown rice'],
    'Blautia': ['curd', 'moong', 'bajra', 'spinach'],
    'Prevotella': ['whole wheat', 'ragi', 'bajra', 'jowar'],
};

// Bacteria to REDUCE → ingredients that do NOT make things worse (we still show good foods)
const BACTERIA_TO_REDUCE_AVOID = {
    'Clostridium': ['rajma'],  // avoid high fermentable foods if trying to reduce
};

// Build ingredient list from patient profile (bacteria to increase drives which foods to show)
function getPatientIngredientKeys() {
    const ingSet = new Set();

    if (patientProfile) {
        const toIncrease = patientProfile.bacteria_to_increase || [];
        toIncrease.forEach(b => {
            const bName = b.name || '';
            // Try exact match first
            const exact = BACTERIA_TO_INGREDIENTS[bName];
            if (exact) { exact.forEach(i => ingSet.add(i)); return; }
            // Try partial match
            Object.keys(BACTERIA_TO_INGREDIENTS).forEach(key => {
                if (bName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(bName.toLowerCase())) {
                    BACTERIA_TO_INGREDIENTS[key].forEach(i => ingSet.add(i));
                }
            });
        });

        // Also scan prebiotics text for keyword matches
        const prebioticText = (patientProfile.prebiotics || '').toLowerCase();
        INGREDIENT_KEYWORDS.forEach(({ keys, mapTo }) => {
            if (keys.some(k => prebioticText.includes(k))) ingSet.add(mapTo);
        });
    }

    // Fallback if nothing matched
    if (ingSet.size === 0) {
        ['oats', 'moong', 'curd', 'ragi', 'whole wheat', 'bajra', 'banana', 'flaxseed', 'spinach', 'sweet potato', 'brown rice', 'jowar'].forEach(i => ingSet.add(i));
    }
    return Array.from(ingSet);
}

document.addEventListener('DOMContentLoaded', () => {
    $('generateBtn').addEventListener('click', handleGenerate);
    $('kitId').addEventListener('keypress', (e) => { if (e.key === 'Enter') handleGenerate(); });
});

// ═══ Main Flow ═══
async function handleGenerate() {
    const kitId = $('kitId').value.trim();
    if (!kitId) { showToast('Please enter a Kit ID', 'error'); return; }

    setLoading(true);
    setStatus('processing', 'Generating...');

    try {
        showToast('📋 Loading patient data...', 'info', 3000);
        const profile = await apiCall(`/patient/${kitId}`, 'GET');
        patientProfile = profile; // store globally for yes-list
        renderProfile(profile);

        showToast('🧠 AI is generating your meal plan (30-60s)...', 'info', 10000);
        const result = await apiCall('/meal', 'POST', { kit_id: kitId });

        mealPlanData = result.meal_plan;
        sanitizeMealPlan(mealPlanData); // fix raw ingredient names → proper dishes
        currentDay = 'day_1';
        renderMealPlan(result);

        setStatus('online', 'Ready');
        showToast('✅ Meal plan generated! Click 🔄 Swap on any meal to replace it.', 'success', 5000);

    } catch (err) {
        console.error(err);
        showToast(`❌ ${err.message}`, 'error', 6000);
        setStatus('error', 'Error');
    } finally {
        setLoading(false);
    }
}

// ═══ Meal Plan Sanitizer (with anti-repetition across all 7 days) ═══
const RAW_INGREDIENT_SIGNALS = [
    'flour', 'whole)', 'raw ', '100g', 'gram', 'powder', 'seeds', 'leaves',
    'extract', 'oil', 'flakes', '(whole', 'bran', 'husk', 'ml', 'protein'
];
const MEAL_TYPE_KEYWORDS = {
    breakfast: ['breakfast', 'morning'],
    lunch: ['lunch', 'afternoon'],
    dinner: ['dinner', 'night', 'evening meal'],
    snack: ['snack', 'tea', 'mid morning', 'evening snack'],
};

function looksLikeRawIngredient(name) {
    if (!name) return true;
    const n = name.toLowerCase();
    // Raw ingredient signal words
    if (RAW_INGREDIENT_SIGNALS.some(s => n.includes(s))) return true;
    // Very short names (1-2 words) are likely raw ingredients
    if (n.split(' ').length <= 2) return true;
    // Name ends with a meal time word (like "wheat breakfast", "rice dinner")
    const mealTimeWords = ['breakfast', 'lunch', 'dinner', 'snack', 'meal', 'morning', 'evening'];
    if (mealTimeWords.some(w => n.endsWith(w))) return true;
    return false;
}

function mealTypeFromKey(key) {
    const k = key.toLowerCase();
    for (const [cat, words] of Object.entries(MEAL_TYPE_KEYWORDS)) {
        if (words.some(w => k.includes(w))) return cat;
    }
    if (k.includes('breakfast')) return 'breakfast';
    if (k.includes('lunch')) return 'lunch';
    if (k.includes('dinner')) return 'dinner';
    return 'snack';
}

// Build a full shuffled pool of dishes for a meal category across ALL ingredients
// Used dishes are excluded to prevent repetition across all 7 days
function getUniqueDishFor(mealCategory, usedNames) {
    const allIngKeys = Object.keys(INGREDIENT_DISH_MAP).filter(k => k !== '_default');
    const patientKeys = getPatientIngredientKeys();

    // Collect all dishes for this meal category, patient-specific first
    const pool = [];
    [...patientKeys, ...allIngKeys].forEach(key => {
        const map = INGREDIENT_DISH_MAP[key];
        if (!map) return;
        const list = map[mealCategory] || [];
        list.forEach(dish => {
            if (!usedNames.has(dish.name) && !pool.some(p => p.name === dish.name)) {
                pool.push(dish);
            }
        });
    });

    // Shuffle pool so selection isn't always the same
    pool.sort(() => Math.random() - 0.5);
    return pool[0] || null;
}

function sanitizeMealPlan(plan) {
    // Track used dish names across the ENTIRE 7-day plan to prevent repetition
    const usedNames = new Set();

    // First pass: record what the AI generated that looks OK (proper dish names)
    for (let d = 1; d <= 7; d++) {
        const day = plan[`day_${d}`];
        if (!day) continue;
        Object.values(day).forEach(meal => {
            if (meal && typeof meal === 'object' && 'name' in meal && !looksLikeRawIngredient(meal.name)) {
                usedNames.add(meal.name);
            }
        });
    }

    // Second pass: replace bad meals with unique dishes
    for (let d = 1; d <= 7; d++) {
        const dayKey = `day_${d}`;
        const day = plan[dayKey];
        if (!day || typeof day !== 'object') continue;

        Object.keys(day).forEach(mealKey => {
            const meal = day[mealKey];
            if (!meal || typeof meal !== 'object' || !('total_calories' in meal)) return;
            if (!looksLikeRawIngredient(meal.name)) return;

            const cat = mealTypeFromKey(mealKey);
            const dish = getUniqueDishFor(cat, usedNames);
            if (!dish) return;

            usedNames.add(dish.name); // mark as used

            meal.name = dish.name;
            meal.ingredients = parseIngredientString(dish.ings);
            meal.total_calories = dish.cal;
            meal.protein_g = dish.pro;
            meal.carbs_g = dish.carb;
            meal.fat_g = dish.fat;
            meal.fiber_g = meal.fiber_g || 3;
            meal.prep_time_min = meal.prep_time_min || 15;
            meal.benefits = `Recommended for gut health (IOM yes-list)`;
        });
    }
}

/**
 * Parse an ingredient string like "Oats (80g), milk (150ml), honey (10g)"
 * into [{name, quantity_g, unit}, ...] with real numeric quantities.
 * Falls back to 100g for entries without a parenthesised quantity.
 */
function parseIngredientString(ingsStr) {
    return ingsStr.split(',').map(part => {
        part = part.trim();
        const match = part.match(/^(.+?)\s*\((\d+(?:\.\d+)?)\s*(g|ml|tsp|tbsp)\)/i);
        if (match) {
            return { name: match[1].trim(), quantity_g: parseFloat(match[2]), unit: match[3].toLowerCase() };
        }
        return { name: part, quantity_g: 100, unit: 'g' };
    });
}


// ═══ Render Profile ═══
function renderProfile(profile) {
    $('profileSection').classList.remove('hidden');

    const cards = [
        { label: 'Kit ID', value: profile.kit_id },
        { label: 'Diet', value: profile.diet_type || 'Veg' },
        { label: 'BMI', value: profile.bmi || 'N/A' },
        { label: 'IBS Type', value: (profile.ibs_info && profile.ibs_info.subtype) || 'N/A' },
        { label: 'Severity', value: (profile.ibs_info && profile.ibs_info.severity_level) || 'N/A' },
        { label: 'Location', value: profile.location || 'N/A' },
        { label: 'Gender', value: profile.gender || 'N/A' },
        { label: 'Age', value: profile.age || 'N/A' },
    ];

    let html = cards.map(c => `
        <div class="profile-card">
            <div class="profile-card-label">${c.label}</div>
            <div class="profile-card-value">${esc(String(c.value))}</div>
        </div>
    `).join('');

    if (profile.avoid_list && profile.avoid_list.length) {
        html += `<div class="profile-card" style="grid-column: span 2">
            <div class="profile-card-label">🚫 Avoid List (Food Allergies)</div>
            <div class="profile-card-value">${profile.avoid_list.map(a => `<span class="avoid-tag red">${esc(a)}</span>`).join('')}</div>
        </div>`;
    }

    const bInc = (profile.bacteria_to_increase ? profile.bacteria_to_increase.filter(b => !b.name.includes('Other')).slice(0, 5) : []);
    const bDec = (profile.bacteria_to_decrease ? profile.bacteria_to_decrease.filter(b => !b.name.includes('Other')).slice(0, 5) : []);
    if (bInc.length) {
        html += `<div class="profile-card" style="grid-column: span 2">
            <div class="profile-card-label">📈 Bacteria to Increase</div>
            <div class="profile-card-value">${bInc.map(b => `<span class="avoid-tag green">${esc(b.name)}</span>`).join('')}</div>
        </div>`;
    }
    if (bDec.length) {
        html += `<div class="profile-card" style="grid-column: span 2">
            <div class="profile-card-label">📉 Bacteria to Decrease</div>
            <div class="profile-card-value">${bDec.map(b => `<span class="avoid-tag blue">${esc(b.name)}</span>`).join('')}</div>
        </div>`;
    }

    $('profileGrid').innerHTML = html;
    $('profileSection').scrollIntoView({ behavior: 'smooth' });
}

// ═══ Render Meal Plan ═══
function renderMealPlan(result) {
    $('mealSection').classList.remove('hidden');
    $('planInfo').textContent = `Kit: ${result.kit_id} • Generated: ${new Date(result.generated_at).toLocaleString()} • Diet: ${(result.patient_summary && result.patient_summary.diet_type) || 'Veg'}`;

    renderDayTabs();
    renderDay('day_1');
    $('mealSection').scrollIntoView({ behavior: 'smooth' });
}

function renderDayTabs() {
    const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    $('dayTabs').innerHTML = names.map((n, i) => {
        const key = `day_${i + 1}`;
        return `<button class="day-tab ${key === currentDay ? 'active' : ''}" onclick="switchDay('${key}')">${n}</button>`;
    }).join('');
}

function switchDay(day) {
    currentDay = day;
    document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.day-tab').forEach(t => {
        if (t.textContent === ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][parseInt(day.split('_')[1]) - 1]) t.classList.add('active');
    });
    renderDay(day);
}

// Core meal order to control rendering sequence
const BASE_MEAL_ORDER = ['breakfast', 'mid_morning_snack', 'lunch', 'evening_snack', 'dinner'];

function sortedMealKeys(day, allKeys) {
    // Produces ordered keys: each base meal followed immediately by its side dishes
    const result = [];
    BASE_MEAL_ORDER.forEach(base => {
        if (allKeys.includes(base)) result.push(base);
        // Append any side dishes for this base meal right after it
        allKeys
            .filter(k => k.startsWith(base + '_side'))
            .sort()
            .forEach(k => result.push(k));
    });
    // Append any remaining keys not covered by BASE_MEAL_ORDER (e.g. custom meals)
    allKeys.forEach(k => { if (!result.includes(k)) result.push(k); });
    return result;
}

function renderDay(dayKey) {
    const day = mealPlanData && mealPlanData[dayKey];
    if (!day) { $('mealsContainer').innerHTML = '<p style="text-align:center;color:var(--text-muted)">No data for this day</p>'; return; }

    // Dynamically find all meal objects, then sort so side dishes appear below their parent
    const allMealKeys = Object.keys(day).filter(k => day[k] && typeof day[k] === 'object' && 'total_calories' in day[k]);
    const meals = sortedMealKeys(day, allMealKeys);
    const labels = { breakfast: '🌅 Breakfast', mid_morning_snack: '🍎 Snack', lunch: '☀️ Lunch', evening_snack: '🫖 Tea Time', dinner: '🌙 Dinner' };

    let html = '';
    let totals = { cal: 0, pro: 0, carb: 0, fat: 0, fib: 0 };

    meals.forEach(type => {
        const m = day[type];
        if (!m || typeof m !== 'object') return;

        const isSideDish = type.includes('_side_');
        const cal = m.total_calories || 0;
        const pro = m.protein_g || 0;
        const carb = m.carbs_g || 0;
        const fat = m.fat_g || 0;
        const fib = m.fiber_g || 0;
        totals.cal += cal; totals.pro += pro; totals.carb += carb; totals.fat += fat; totals.fib += fib;

        const ings = (m.ingredients || []).map(i => {
            let nutInfo = '';
            if (i.nutrition_per_serving) {
                nutInfo = ` (${i.nutrition_per_serving.calories} kcal, ${i.nutrition_per_serving.protein_g}g pro)`;
            }
            return `<div class="ingredient-row">
                <span class="ingredient-name">${esc(i.name || '')}</span>
                <span class="ingredient-qty">${typeof i.quantity_g === 'number' ? i.quantity_g + (i.unit || 'g') : (i.quantity_g || '')}${nutInfo ? `<br><span class="ingredient-nutrition">${nutInfo}</span>` : ''}</span>
            </div>`;
        }).join('');

        // Side dish card gets an indented left-border style; no ➕ button on side dishes
        html += `<div class="meal-card${isSideDish ? ' side-dish-card' : ''}" id="meal-${dayKey}-${type}">
            <div class="meal-content">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <span class="meal-type${isSideDish ? ' side-type' : ''}">${(window.customLabels && window.customLabels[type]) || labels[type] || type.replace(/_/g, ' ')}</span>
                    ${m.prep_time_min ? `<span style="font-size:0.7rem;color:var(--text-muted)">⏱ ${m.prep_time_min}min</span>` : ''}
                </div>
                <h3 class="meal-name">${esc(m.name || 'Meal')}</h3>
                ${m.benefits ? `<p class="meal-benefits">${esc(m.benefits)}</p>` : ''}
                <div class="ingredients-list">
                    <div class="ingredients-label">Ingredients</div>
                    ${ings}
                </div>
                <div class="macro-grid">
                    <div class="macro-box"><span class="macro-val">${pro}g</span><span class="macro-lbl">Protein</span></div>
                    <div class="macro-box"><span class="macro-val">${carb}g</span><span class="macro-lbl">Carbs</span></div>
                    <div class="macro-box"><span class="macro-val">${fat}g</span><span class="macro-lbl">Fat</span></div>
                    <div class="macro-box"><span class="macro-val">${fib}g</span><span class="macro-lbl">Fiber</span></div>
                </div>
                ${isSideDish ? '' : `
                <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
                    <button class="btn-swap-meal" style="background:rgba(16,185,129,0.15);color:#10b981;border-color:#10b981" onclick="openYesListChooser('${dayKey}', '${type}')">
                        🥗 Choose from Yes-List
                    </button>
                    <button class="btn-swap-meal btn-add-side" onclick="openAddMealModal('${dayKey}', '${type}')">
                        ➕ Add Side Dish
                    </button>
                </div>`}
                ${isSideDish ? `
                <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
                    <button class="btn-swap-meal" style="background:rgba(99,102,241,0.15);color:#a5b4fc;border-color:#6366f1" onclick="openEditMealModal('${dayKey}','${type}')">
                        ✏️ Edit
                    </button>
                    <button class="btn-swap-meal" style="background:rgba(239,68,68,0.15);color:#f87171;border-color:#ef4444" onclick="deleteSideDish('${dayKey}','${type}')">
                        🗑️ Delete
                    </button>
                </div>` : ''}
            </div>
            <div class="meal-cal-box">
                <span class="cal-value">${cal}</span>
                <span class="cal-label">kcal</span>
            </div>
        </div>`;
    });

    $('mealsContainer').innerHTML = html;

    // ── Daily summary with NIN RDA reference ──
    // NIN (National Institute of Nutrition) Recommended Dietary Allowances
    const gender = (patientProfile && patientProfile.gender || '').toLowerCase();
    const isFemale = gender.startsWith('f') || gender === 'woman' || gender === 'female';
    const NIN_RDA = isFemale
        ? { cal: 2230, pro: 55, carb: 335, fat: 60, fib: 30, label: 'NIN RDA – Reference Woman' }
        : { cal: 2730, pro: 60, carb: 410, fat: 73, fib: 30, label: 'NIN RDA – Reference Man' };
    const target = mealPlanData.calorie_target || NIN_RDA.cal;
    const summary = $('dailySummary');
    summary.classList.remove('hidden');
    summary.innerHTML = `
        <div class="summary-title">📊 Daily Totals — ${dayKey.replace('_', ' ').replace('d', 'D')}
            <span style="font-size:0.72rem;font-weight:400;color:var(--text-muted);margin-left:10px">vs ${NIN_RDA.label}</span>
        </div>
        <div class="bar-grid">
            ${makeBar('Calories', totals.cal, target, 'kcal', 'cal')}
            ${makeBar('Protein', totals.pro, NIN_RDA.pro, 'g', 'pro')}
            ${makeBar('Carbs', totals.carb, NIN_RDA.carb, 'g', 'carb')}
            ${makeBar('Fat', totals.fat, NIN_RDA.fat, 'g', 'fat')}
            ${makeBar('Fiber', totals.fib, NIN_RDA.fib, 'g', 'fib')}
        </div>
    `;
}

function makeBar(label, val, max, unit, cls) {
    const pct = Math.min(100, (val / max) * 100);
    return `<div class="bar-item">
        <div class="bar-header"><span class="bar-label">${label}</span><span class="bar-value">${Math.round(val)}/${max} ${unit}</span></div>
        <div class="bar-track"><div class="bar-fill ${cls}" style="width:${pct}%"></div></div>
    </div>`;
}

// ═══ Swap Feature ═══
function openSwapModal(day, mealType, mealName) {
    swapTarget = { day, meal_type: mealType, name: mealName };
    const labels = { breakfast: 'Breakfast', mid_morning_snack: 'Mid-Morning Snack', lunch: 'Lunch', evening_snack: 'Evening Snack', dinner: 'Dinner' };
    $('swapMealInfo').innerHTML = `Replacing <strong>${esc(mealName)}</strong> (${labels[mealType] || mealType}, ${day.replace('_', ' ')})`;
    $('swapReason').value = '';
    $('swapModal').classList.remove('hidden');
}

function closeSwapModal() {
    $('swapModal').classList.add('hidden');
    swapTarget = null;
}

async function confirmSwap() {
    if (!swapTarget) return;

    const kitId = $('kitId').value.trim();
    const reason = $('swapReason').value.trim();
    const { day, meal_type, name } = swapTarget;

    // Show loading
    $('swapBtnText').textContent = 'Swapping...';
    $('swapSpinner').classList.remove('hidden');
    const btn = $('swapBtn');
    btn.disabled = true;

    // Highlight the card being swapped
    const card = document.getElementById(`meal-${day}-${meal_type}`);
    if (card) card.classList.add('swapping');

    try {
        const result = await apiCall('/swap', 'POST', {
            kit_id: kitId,
            day: day,
            meal_type: meal_type,
            current_meal: name,
            reason: reason,
        });

        // Update the meal plan data in memory
        if (result.new_meal && mealPlanData[day]) {
            mealPlanData[day][meal_type] = result.new_meal;
            renderDay(day); // Re-render current day
            showToast(`✅ Swapped! "${name}" → "${result.new_meal.name}"`, 'success', 5000);

            // Flash animation on the new card
            setTimeout(() => {
                const newCard = document.getElementById(`meal-${day}-${meal_type}`);
                if (newCard) newCard.classList.add('swapped');
            }, 50);
        }

        closeSwapModal();

    } catch (err) {
        showToast(`❌ Swap failed: ${err.message}`, 'error', 5000);
        if (card) card.classList.remove('swapping');
    } finally {
        $('swapBtnText').textContent = '🔄 Get Alternative';
        $('swapSpinner').classList.add('hidden');
        btn.disabled = false;
    }
}

// ═══ Add Custom Meal Feature ═══
let addMealDayTarget = null;
let addMealTypeTarget = null;

const MEAL_TYPE_LABELS = {
    breakfast: '🌅 Breakfast',
    mid_morning_snack: '🍎 Snack',
    lunch: '☀️ Lunch',
    evening_snack: '🫖 Tea Time',
    dinner: '🌙 Dinner'
};

function openAddMealModal(day, mealType) {
    addMealDayTarget = day;
    addMealTypeTarget = mealType || null;
    const friendlyLabel = MEAL_TYPE_LABELS[mealType] || (mealType ? mealType.replace(/_/g, ' ') : '') || '';
    $('addMealType').value = friendlyLabel ? `Side Dish (${friendlyLabel.replace(/^[^\w]*/, '').trim()})` : '';
    $('addMealName').value = '';
    $('addMealIngredients').value = '';
    $('addMealCal').value = '0';
    $('addMealPro').value = '0';
    $('addMealCarb').value = '0';
    $('addMealFat').value = '0';
    // Update modal title to show context
    const modalTitle = document.querySelector('#addMealModal .modal-header h3');
    if (modalTitle) modalTitle.textContent = mealType ? `➕ Add Side Dish — ${friendlyLabel}` : '➕ Add Custom Meal';
    $('addMealModal').classList.remove('hidden');
}

function closeAddMealModal() {
    $('addMealModal').classList.add('hidden');
    addMealDayTarget = null;
    addMealTypeTarget = null;
}

function confirmAddMeal() {
    if (!addMealDayTarget) return;
    const type = $('addMealType').value.trim() || 'Custom Meal';
    const name = $('addMealName').value.trim() || 'Unnamed Meal';
    const ings = $('addMealIngredients').value.split(',').map(i => i.trim()).filter(i => i);

    const cal = parseInt($('addMealCal').value) || 0;
    const pro = parseInt($('addMealPro').value) || 0;
    const carb = parseInt($('addMealCarb').value) || 0;
    const fat = parseInt($('addMealFat').value) || 0;

    const newMeal = {
        name: name,
        ingredients: ings.map(ing => ({ name: ing, quantity_g: "N/A" })),
        total_calories: cal,
        protein_g: pro,
        carbs_g: carb,
        fat_g: fat,
        fiber_g: 0,
        prep_time_min: 5,
        benefits: "✏️ Side dish added by Nutritionist"
    };

    // Generate a unique key based on the parent meal type
    let mealKey;
    if (addMealTypeTarget) {
        // Find existing side dishes for this meal type to number them
        const existingSides = Object.keys(mealPlanData[addMealDayTarget]).filter(k => k.startsWith(addMealTypeTarget + '_side'));
        mealKey = `${addMealTypeTarget}_side_${existingSides.length + 1}`;
    } else {
        mealKey = type.toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (mealPlanData[addMealDayTarget][mealKey]) {
            mealKey = mealKey + '_' + Math.floor(Math.random() * 1000);
        }
    }

    mealPlanData[addMealDayTarget][mealKey] = newMeal;

    if (!window.customLabels) window.customLabels = {};
    window.customLabels[mealKey] = `➕ ${type}`;

    renderDay(addMealDayTarget);
    closeAddMealModal();
    autosavePlan();  // persist modification to localStorage + backend
    
    // Save new side dish to the global custom recipes database
    apiCall('/recipe', 'POST', {
        name: newMeal.name,
        ingredients: newMeal.ingredients,
        total_calories: newMeal.total_calories,
        protein_g: newMeal.protein_g,
        carbs_g: newMeal.carbs_g,
        fat_g: newMeal.fat_g,
        fiber_g: newMeal.fiber_g,
        benefits: newMeal.benefits,
        created_by: "Nutritionist (" + ($('kitId').value || 'Unknown') + ")"
    }).catch(e => console.error("Could not save recipe globally:", e));

    showToast(`✅ Added side dish: "${name}"`, 'success');
}

// ═══ Edit Side Dish Feature ═══
let _editDay = null;
let _editKey = null;

function openEditMealModal(dayKey, mealKey) {
    const meal = mealPlanData && mealPlanData[dayKey] && mealPlanData[dayKey][mealKey];
    if (!meal) return;
    _editDay = dayKey;
    _editKey = mealKey;

    $('editMealName').value = meal.name || '';
    $('editMealIngredients').value = (meal.ingredients || []).map(i => {
        if (typeof i.quantity_g === 'number') return `${i.name} (${i.quantity_g}${i.unit || 'g'})`;
        return i.name || '';
    }).join(', ');
    $('editMealCal').value  = meal.total_calories || 0;
    $('editMealPro').value  = meal.protein_g  || 0;
    $('editMealCarb').value = meal.carbs_g    || 0;
    $('editMealFat').value  = meal.fat_g      || 0;
    $('editMealModal').classList.remove('hidden');
}

function closeEditMealModal() {
    $('editMealModal').classList.add('hidden');
    _editDay = null;
    _editKey = null;
}

function confirmEditMeal() {
    if (!_editDay || !_editKey) return;
    const meal = mealPlanData[_editDay][_editKey];
    if (!meal) return;

    meal.name           = $('editMealName').value.trim() || meal.name;
    meal.ingredients    = parseIngredientString($('editMealIngredients').value);
    meal.total_calories = parseInt($('editMealCal').value)  || 0;
    meal.protein_g      = parseInt($('editMealPro').value)  || 0;
    meal.carbs_g        = parseInt($('editMealCarb').value) || 0;
    meal.fat_g          = parseInt($('editMealFat').value)  || 0;
    meal.benefits       = meal.benefits || '✏️ Edited by Nutritionist';

    closeEditMealModal();
    renderDay(_editDay);
    autosavePlan();
    
    // Update side dish in the global custom recipes database
    apiCall('/recipe', 'POST', {
        name: meal.name,
        ingredients: meal.ingredients,
        total_calories: meal.total_calories,
        protein_g: meal.protein_g,
        carbs_g: meal.carbs_g,
        fat_g: meal.fat_g,
        fiber_g: meal.fiber_g,
        benefits: meal.benefits,
        created_by: "Nutritionist Edit (" + ($('kitId').value || 'Unknown') + ")"
    }).catch(e => console.error("Could not update recipe globally:", e));
    
    showToast(`✅ Updated: "${meal.name}"`, 'success');
}

// ═══ Delete Side Dish Feature ═══
function deleteSideDish(dayKey, mealKey) {
    if (!mealPlanData || !mealPlanData[dayKey]) return;
    const meal = mealPlanData[dayKey][mealKey];
    const name = meal ? meal.name : mealKey;
    if (!confirm(`Delete "${name}"?`)) return;
    delete mealPlanData[dayKey][mealKey];
    if (window.customLabels) delete window.customLabels[mealKey];
    renderDay(dayKey);
    autosavePlan();
    showToast(`🗑️ Deleted: "${name}"`, 'info');
}


// ═══ PDF Export — built programmatically with jsPDF (no html2canvas, no blank pages) ═══
function downloadPDF() {
    if (!mealPlanData) { showToast('⚠️ No meal plan to export.', 'error'); return; }
    const kitId = $('kitId').value.trim() || 'MealPlan';
    showToast('📄 Generating PDF…', 'info', 8000);

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

        const PW = 210, PH = 297;
        const LM = 14, RM = 14, TM = 14;
        const CW = PW - LM - RM;
        let y = TM;
        let pageNum = 1;

        const BG       = [15,  23,  42];
        const BG2      = [30,  41,  59];
        const ACCENT   = [129, 140, 248];
        const GREEN    = [52,  211, 153];
        const MUTED    = [148, 163, 184];
        const WHITE    = [241, 245, 249];
        const BORDER   = [51,  65,  85];

        const dayNames = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
        const MEAL_LABELS = {
            breakfast: 'Breakfast',
            mid_morning_snack: 'Mid-Morning Snack',
            lunch: 'Lunch',
            evening_snack: 'Evening Snack',
            dinner: 'Dinner'
        };

        function fillPage() {
            doc.setFillColor(...BG);
            doc.rect(0, 0, PW, PH, 'F');
        }

        function newPage() {
            doc.addPage();
            pageNum++;
            fillPage();
            y = TM;
        }

        function checkY(needed) {
            if (y + needed > PH - 14) newPage();
        }

        function setTxt(size, color, bold) {
            doc.setFontSize(size);
            doc.setTextColor(...color);
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
        }

        function fmtQty(i) {
            if (!i || typeof i.quantity_g !== 'number') return '';
            return i.quantity_g + (i.unit || 'g');
        }

        function drawBadge(label, bx, by, bgCol, txtCol) {
            const cleanLabel = (label || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}➕✏️]/gu, '').trim();
            doc.setFontSize(7);
            doc.setFont('helvetica','bold');
            const tw = doc.getTextWidth(cleanLabel) + 5;
            doc.setFillColor(...bgCol);
            doc.roundedRect(bx, by - 3.8, tw, 5.2, 1, 1, 'F');
            doc.setTextColor(...txtCol);
            doc.text(cleanLabel, bx + 2.5, by);
            return tw + 2;
        }
        
        // Helper to prevent jsPDF from garbling standard text with emojis
        function cleanText(str) {
            if (!str) return '';
            return str.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}➕✏️🍲🔥📊📈📉🚫]/gu, '').trim();
        }

        // ── PAGE 1: Cover + Profile ─────────────────────────
        fillPage();

        // Header bar
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, PW, 22, 'F');
        setTxt(13, [255,255,255], true);
        doc.text('NutriGenie  -  7-Day Personalized Meal Plan', LM, 13);
        setTxt(7.5, [200,200,230], false);
        doc.text('IOM Bioworks  |  Kit: ' + kitId + '  |  ' + new Date().toLocaleDateString('en-IN'), LM, 19);
        y = 30;

        if (patientProfile) {
            const p = patientProfile;
            // Section heading
            setTxt(11, ACCENT, true);
            doc.text('Patient Profile', LM, y); y += 6;
            doc.setDrawColor(...ACCENT);
            doc.setLineWidth(0.5);
            doc.line(LM, y, LM+CW, y); y += 5;

            // Profile 2-col grid
            const fields = [
                ['Kit ID', p.kit_id||'N/A'],   ['Age', p.age||'N/A'],
                ['Gender', p.gender||'N/A'],   ['BMI', p.bmi||'N/A'],
                ['Diet', p.diet_type||'Veg'],  ['Location', p.location||'N/A'],
                ['IBS Type', (p.ibs_info&&p.ibs_info.subtype)||'N/A'],
                ['Severity', (p.ibs_info&&p.ibs_info.severity_level)||'N/A'],
            ];
            const colW = CW / 2;
            const rowH = 7;
            fields.forEach(([k,v], i) => {
                const cx = LM + (i%2)*colW;
                const ry = y + Math.floor(i/2)*rowH;
                setTxt(8, MUTED, true);  doc.text(k+':', cx, ry);
                setTxt(8, WHITE, false); doc.text(String(v), cx+24, ry);
            });
            y += Math.ceil(fields.length/2)*rowH + 5;

            // NIN RDA box
            const isFem = (p.gender||'').toLowerCase().startsWith('f');
            const RDA = isFem
                ? {cal:2230,pro:55,carb:335,fat:60,fib:30,lbl:'Reference Woman'}
                : {cal:2730,pro:60,carb:410,fat:73,fib:30,lbl:'Reference Man'};
            doc.setFillColor(...BG2);
            doc.roundedRect(LM, y, CW, 15, 2, 2, 'F');
            doc.setFillColor(...ACCENT);
            doc.rect(LM, y, 2.5, 15, 'F');
            setTxt(8, ACCENT, true);
            doc.text('NIN RDA ('+RDA.lbl+')', LM+6, y+5.5);
            setTxt(7.5, MUTED, false);
            doc.text('Calories: '+RDA.cal+' kcal  |  Protein: '+RDA.pro+'g  |  Carbs: '+RDA.carb+'g  |  Fat: '+RDA.fat+'g  |  Fiber: '+RDA.fib+'g', LM+6, y+12);
            y += 20;

            // Bacteria to increase
            const bInc = (p.bacteria_to_increase||[]).filter(b=>b.name&&!b.name.includes('Other')).slice(0,6);
            if (bInc.length) {
                setTxt(8, MUTED, true); doc.text('Bacteria to Increase:', LM, y); y += 5;
                let bx = LM;
                bInc.forEach(b => {
                    if (bx + doc.getTextWidth(b.name) + 10 > LM+CW) { bx=LM; y+=6; }
                    bx += drawBadge(b.name, bx, y, [5,46,22], GREEN);
                });
                y += 8;
            }

            // Bacteria to decrease
            const bDec = (p.bacteria_to_decrease||[]).filter(b=>b.name&&!b.name.includes('Other')).slice(0,5);
            if (bDec.length) {
                setTxt(8, MUTED, true); doc.text('Bacteria to Decrease:', LM, y); y += 5;
                let bx = LM;
                bDec.forEach(b => {
                    if (bx + doc.getTextWidth(b.name) + 10 > LM+CW) { bx=LM; y+=6; }
                    bx += drawBadge(b.name, bx, y, [30,58,95], [96,165,250]);
                });
                y += 8;
            }

            // Avoid list
            const avList = p.avoid_list||[];
            if (avList.length) {
                setTxt(8, MUTED, true); doc.text('Avoid List:', LM, y); y += 5;
                let bx = LM;
                avList.forEach(a => {
                    if (bx + doc.getTextWidth(a) + 10 > LM+CW) { bx=LM; y+=6; }
                    bx += drawBadge(a, bx, y, [69,10,10], [248,113,113]);
                });
                y += 8;
            }

            // Note
            checkY(12);
            doc.setFillColor(...BG2);
            doc.roundedRect(LM, y, CW, 12, 2, 2, 'F');
            setTxt(7.5, MUTED, false);
            const noteLines = doc.splitTextToSize('This meal plan is AI-generated from your IOM gut microbiome report. Each day provides balanced Indian meals to support beneficial bacteria while avoiding trigger foods.', CW-6);
            doc.text(noteLines, LM+3, y+5);
            y += 14;
        }

        // Page footer
        setTxt(7, MUTED, false);
        doc.text('Page 1 of 8  |  NutriGenie by IOM Bioworks', PW/2, PH-6, {align:'center'});

        // ── PAGES 2-8: One page per day ──────────────────────
        for (let d = 1; d <= 7; d++) {
            const day = mealPlanData['day_'+d];
            if (!day) continue;
            newPage();

            // Day header bar
            doc.setFillColor(49, 46, 129);
            doc.rect(0, 0, PW, 20, 'F');
            setTxt(14, ACCENT, true);
            doc.text('Day '+d+'  -  '+dayNames[d-1], LM, 13);
            setTxt(8, [165,180,252], false);
            doc.text('Kit: '+kitId, PW-RM, 13, {align:'right'});
            y = 28;

            const allKeys = Object.keys(day).filter(k => day[k] && typeof day[k]==='object' && 'total_calories' in day[k]);
            const sorted = sortedMealKeys(day, allKeys);
            let tC=0, tP=0, tCb=0, tF=0, tFb=0;

            sorted.forEach(function(type) {
                const m = day[type];
                if (!m) return;
                const cal  = m.total_calories||0;
                const pro  = m.protein_g||0;
                const carb = m.carbs_g||0;
                const fat  = m.fat_g||0;
                const fib  = m.fiber_g||0;
                tC+=cal; tP+=pro; tCb+=carb; tF+=fat; tFb+=fib;

                const isSide = type.includes('_side_');
                // FIXED: Replace emojis from labels to prevent jsPDF garbling (WinAnsiEncoding error)
                let rawLbl = (window.customLabels&&window.customLabels[type]) || MEAL_LABELS[type] || type.replace(/_/g,' ');
                if (isSide && rawLbl.includes('➕')) {
                    rawLbl = rawLbl.replace('➕', '+');
                }
                const lbl = cleanText(rawLbl);
                const ingStr = (m.ingredients||[]).map(i => {
                    const q = fmtQty(i); return cleanText(i.name) + (q ? ' ('+q+')' : '');
                }).join(', ');

                const indentX = isSide ? LM+6 : LM;
                const cardW   = isSide ? CW-6 : CW;

                // estimate wrapped ingredient lines
                doc.setFontSize(7.5);
                const ingWrapped = doc.splitTextToSize(ingStr, cardW-8);
                const nameWrapped = doc.splitTextToSize(cleanText(m.name||''), cardW-8);
                const cardH = 7 + nameWrapped.length*5 + ingWrapped.length*4.5 + 9;

                checkY(cardH+3);

                // Card
                doc.setFillColor(...BG2);
                doc.roundedRect(indentX, y, cardW, cardH, 1.5, 1.5, 'F');
                doc.setDrawColor(...BORDER);
                doc.setLineWidth(0.2);
                doc.roundedRect(indentX, y, cardW, cardH, 1.5, 1.5, 'S');

                // Side dish left bar
                if (isSide) {
                    doc.setFillColor(217,119,6);
                    doc.rect(indentX, y, 2.5, cardH, 'F');
                }

                // Meal type badge
                const badgeBg  = isSide ? [120,53,15]  : [49,46,129];
                const badgeTxt = isSide ? [251,191,36]  : [165,180,252];
                drawBadge(lbl, indentX+4, y+5, badgeBg, badgeTxt);

                // Calories badge right
                const calStr = cal+' kcal';
                doc.setFontSize(7.5); doc.setFont('helvetica','bold');
                const calTW = doc.getTextWidth(calStr)+5;
                doc.setFillColor(6,78,59);
                doc.roundedRect(indentX+cardW-calTW-3, y+1.5, calTW, 5.2, 1, 1, 'F');
                doc.setTextColor(...GREEN);
                doc.text(calStr, indentX+cardW-calTW-1, y+5.5);

                // Dish name
                let cy = y+9;
                setTxt(9.5, WHITE, true);
                doc.text(nameWrapped, indentX+4, cy);
                cy += nameWrapped.length*5;

                // Ingredients
                setTxt(7.5, [107,114,128], true);
                doc.text('Ingredients: ', indentX+4, cy);
                const labelW = doc.getTextWidth('Ingredients: ');
                setTxt(7.5, MUTED, false);
                // first line beside label
                if (ingWrapped.length>0) doc.text(ingWrapped[0], indentX+4+labelW, cy);
                for (let li=1; li<ingWrapped.length; li++) {
                    cy+=4.5; doc.text(ingWrapped[li], indentX+4, cy);
                }
                cy+=5;

                // Macro pills
                const macros=[['P',pro+'g',[99,102,241]],['C',carb+'g',[245,158,11]],['F',fat+'g',[239,68,68]],['Fb',fib+'g',[16,185,129]]];
                let mx=indentX+4;
                macros.forEach(([lbl2,val,col])=>{
                    doc.setFontSize(7);
                    const pw = doc.getTextWidth(lbl2+':'+val)+5;
                    doc.setFillColor(13,21,38);
                    doc.roundedRect(mx, cy-3.5, pw, 4.8, 0.8, 0.8, 'F');
                    doc.setTextColor(...col); doc.setFont('helvetica','bold');
                    doc.text(lbl2+':', mx+1.5, cy);
                    doc.setTextColor(...WHITE); doc.setFont('helvetica','normal');
                    doc.text(val, mx+1.5+doc.getTextWidth(lbl2+':'), cy);
                    mx+=pw+2;
                });

                y += cardH+3;
            });

            // Daily totals
            checkY(18);
            const isFemD = (patientProfile&&(patientProfile.gender||'').toLowerCase().startsWith('f'));
            const RDAD = isFemD
                ? {cal:2230,pro:55,carb:335,fat:60,fib:30,lbl:'Ref. Woman'}
                : {cal:2730,pro:60,carb:410,fat:73,fib:30,lbl:'Ref. Man'};
            doc.setFillColor(...BG2);
            doc.roundedRect(LM, y, CW, 17, 2, 2, 'F');
            doc.setFillColor(...ACCENT);
            doc.rect(LM, y, 2.5, 17, 'F');
            setTxt(8, ACCENT, true);
            doc.text('Daily Totals  vs  NIN RDA ('+RDAD.lbl+')', LM+6, y+6);
            setTxt(7.5, MUTED, false);
            doc.text('Cal: '+tC+'/'+RDAD.cal+' kcal   Prot: '+tP+'/'+RDAD.pro+'g   Carbs: '+tCb+'/'+RDAD.carb+'g   Fat: '+tF+'/'+RDAD.fat+'g   Fiber: '+tFb+'/'+RDAD.fib+'g', LM+6, y+13);
            y+=20;

            // Footer
            setTxt(7, MUTED, false);
            doc.text('Page '+(d+1)+' of 8  |  NutriGenie by IOM Bioworks', PW/2, PH-6, {align:'center'});
        }

        doc.save(kitId+'_Meal_Plan.pdf');
        showToast('✅ PDF Downloaded!', 'success');

    } catch(err) {
        console.error('PDF error:', err);
        showToast('❌ PDF failed: '+err.message, 'error', 8000);
    }
}


// ═══ Yes-List Food Chooser (ingredient-based, rotates by day) ═══
function getMealCategory(mealType) {
    const t = mealType.toLowerCase();
    if (t.includes('breakfast')) return 'breakfast';
    if (t.includes('lunch')) return 'lunch';
    if (t.includes('dinner')) return 'dinner';
    return 'snack';
}

// Rotate ingredient by BOTH day AND meal slot — so each meal in a day gets a different ingredient
// e.g. Day1: breakfast=oats, lunch=ragi, snack=curd, dinner=whole wheat
//      Day2: breakfast=moong, lunch=bajra, snack=flaxseed, dinner=banana
const MEAL_SLOT_ORDER = ['breakfast', 'snack', 'lunch', 'dinner'];

function getIngredientForDayAndMeal(dayKey, mealCategory) {
    const ingKeys = getPatientIngredientKeys();
    const dayNum = parseInt(dayKey.replace('day_', '')) - 1;
    const slotIndex = MEAL_SLOT_ORDER.indexOf(mealCategory);
    const slot = slotIndex >= 0 ? slotIndex : 0;
    // Offset by both day and slot to get true variety
    const index = (dayNum * MEAL_SLOT_ORDER.length + slot) % ingKeys.length;
    return ingKeys[index] || '_default';
}

function openYesListChooser(dayKey, mealType) {
    const category = getMealCategory(mealType);

    // Collect ALL dishes across every ingredient for this meal category
    const patientKeys = getPatientIngredientKeys();
    const allIngKeys  = [...new Set([...patientKeys, ...Object.keys(INGREDIENT_DISH_MAP)])];

    const groups = [];
    const seenNames = new Set();

    allIngKeys.forEach(key => {
        if (key === '_default') return;
        const map = INGREDIENT_DISH_MAP[key];
        if (!map) return;
        const dishes = map[category] || [];
        if (!dishes.length) return;
        const unique = dishes.filter(d => !seenNames.has(d.name));
        if (!unique.length) return;
        unique.forEach(d => seenNames.add(d.name));
        const isYesList = patientKeys.includes(key);
        groups.push({ label: map.label, key, foods: unique, isYesList });
    });

    // Yes-list groups first
    groups.sort((a, b) => (b.isYesList ? 1 : 0) - (a.isYesList ? 1 : 0));

    // Add _default dishes not yet seen
    const defaultDishes = (INGREDIENT_DISH_MAP['_default'][category] || []).filter(d => !seenNames.has(d.name));
    if (defaultDishes.length) {
        groups.push({ label: 'Gut Health Classics', key: '_default', foods: defaultDishes, isYesList: false });
    }

    const allFoods = groups.flatMap(g => g.foods);
    if (!allFoods.length) { showToast('⚠️ No suggestions available.', 'error'); return; }

    const categoryLabels = { breakfast: '🌅 Breakfast', lunch: '☀️ Lunch', snack: '🍎 Snack', dinner: '🌙 Dinner' };
    const dayNum   = parseInt(dayKey.replace('day_', ''));
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayLabel = dayNames[dayNum - 1] || dayKey;
    const totalCount = allFoods.length;

    let html = `<div class="modal-overlay" id="yesListModal" onclick="if(event.target===this)closeYesListModal()">
    <div class="modal-card" style="max-height:85vh;overflow-y:auto;width:520px">
        <div class="modal-header">
            <h3>🥗 ${categoryLabels[category] || 'Meal'} Alternatives — ${dayLabel}</h3>
            <button class="modal-close" onclick="closeYesListModal()">✕</button>
        </div>
        <p style="padding:4px 20px 8px;font-size:0.76rem;color:var(--text-muted)">
            <strong style="color:var(--success)">${totalCount} options</strong> across
            <strong>${groups.length} food groups</strong> — tap any dish to replace the current ${category}.
        </p>`;

    let globalIndex = 0;
    groups.forEach(group => {
        html += `<div style="padding:6px 14px 0">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;padding:4px 0;border-bottom:1px solid var(--border)">
                ${group.isYesList
                    ? `<span style="font-size:0.65rem;background:rgba(16,185,129,0.15);color:#10b981;border:1px solid #10b981;padding:1px 6px;border-radius:4px;font-weight:700">✓ YES LIST</span>`
                    : `<span style="font-size:0.65rem;background:var(--bg-glass);color:var(--text-muted);border:1px solid var(--border);padding:1px 6px;border-radius:4px">ALTERNATIVE</span>`
                }
                <span style="font-size:0.8rem;font-weight:600;color:var(--text-primary)">${esc(group.label)}</span>
                <span style="font-size:0.7rem;color:var(--text-muted);margin-left:auto">${group.foods.length} option${group.foods.length > 1 ? 's' : ''}</span>
            </div>`;

        group.foods.forEach(f => {
            const idx = globalIndex++;
            html += `<div onclick="replaceWithYesListFood('${dayKey}','${mealType}',${idx})"
                style="background:var(--bg-glass);border:1px solid var(--border);border-radius:8px;
                       padding:10px 13px;margin-bottom:6px;cursor:pointer;transition:all 0.2s;"
                onmouseover="this.style.borderColor='#10b981';this.style.transform='translateX(3px)'"
                onmouseout="this.style.borderColor='var(--border)';this.style.transform='none'">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <strong style="font-size:0.88rem">${esc(f.name)}</strong>
                    <span style="font-size:0.74rem;color:#10b981;background:rgba(16,185,129,0.12);padding:2px 8px;border-radius:6px;white-space:nowrap">${f.cal} kcal</span>
                </div>
                <div style="font-size:0.71rem;color:var(--text-muted);margin-top:3px;line-height:1.4">${esc(f.ings)}</div>
                <div style="display:flex;gap:10px;margin-top:4px;font-size:0.68rem;color:var(--text-secondary)">
                    <span>Protein: ${f.pro}g</span><span>Carbs: ${f.carb}g</span><span>Fat: ${f.fat}g</span>
                </div>
            </div>`;
        });
        html += `</div>`;
    });

    html += `</div></div></div>`;
    window._yesListFoods = allFoods;
    document.body.insertAdjacentHTML('beforeend', html);
}

function closeYesListModal() {
    const m = document.getElementById('yesListModal');
    if (m) m.remove();
}

function replaceWithYesListFood(dayKey, mealType, foodIndex) {
    const f = window._yesListFoods && window._yesListFoods[foodIndex];
    if (!f || !(mealPlanData && mealPlanData[dayKey])) return;

    // Find which ingredient this dish belongs to for the benefits label
    let ingredientLabel = 'IOM yes-list recommendation';
    Object.entries(INGREDIENT_DISH_MAP).forEach(([key, map]) => {
        const allDishes = [...(map.breakfast||[]), ...(map.lunch||[]), ...(map.dinner||[]), ...(map.snack||[])];
        if (allDishes.some(d => d.name === f.name)) {
            ingredientLabel = map.label || ingredientLabel;
        }
    });

    const newMeal = {
        name: f.name,
        ingredients: parseIngredientString(f.ings || ''),
        total_calories: f.cal,
        protein_g: f.pro,
        carbs_g: f.carb,
        fat_g: f.fat || 0,
        fiber_g: 3,
        prep_time_min: 15,
        benefits: `From yes-list: ${ingredientLabel}`
    };

    mealPlanData[dayKey][mealType] = newMeal;
    closeYesListModal();
    renderDay(dayKey);
    autosavePlan();
    showToast(`✅ Replaced with "${f.name}"!`, 'success');
}

// ═══ API ═══
async function apiCall(endpoint, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body && method !== 'GET') opts.body = JSON.stringify(body);
    const res = await fetch(`${API_URL}${endpoint}`, opts);
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `HTTP ${res.status}`); }
    return res.json();
}

// ═══ Helpers ═══
function setLoading(on) {
    $('generateBtn').disabled = on;
    $('btnText').classList.toggle('hidden', on);
    $('spinner').classList.toggle('hidden', !on);
}
function setStatus(type, text) {
    document.querySelector('.status-dot').className = `status-dot ${type}`;
    document.querySelector('.status-text').textContent = text;
}
function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function showToast(msg, type = 'info', dur = 4000) {
    const t = document.createElement('div'); t.className = `toast ${type} `; t.textContent = msg;
    $('toastContainer').appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; t.style.transition = 'all 0.3s'; setTimeout(() => t.remove(), 300); }, dur);
}

// ═══ Plan Persistence — localStorage + JSON export ═══

const STORAGE_KEY = 'nutrigenie_saved_plan';

/**
 * Called after any modification (swap, side dish, yes-list replace).
 * Saves the current full plan to localStorage and silently tries to
 * POST an updated snapshot to the backend for audit trail.
 */
function autosavePlan() {
    if (!mealPlanData) return;
    const kitId = $('kitId').value.trim();
    const snapshot = {
        kit_id: kitId,
        saved_at: new Date().toISOString(),
        patient_summary: patientProfile ? {
            name: patientProfile.name,
            diet_type: patientProfile.diet_type,
            avoid_list: patientProfile.avoid_list,
            bmi: patientProfile.bmi,
            ibs_subtype: patientProfile.ibs_info && patientProfile.ibs_info.subtype
        } : {},
        meal_plan: mealPlanData,
        custom_labels: window.customLabels || {}
    };

    // 1. Always save to localStorage (works offline too)
    try {
        localStorage.setItem(`${STORAGE_KEY}_${kitId}`, JSON.stringify(snapshot));
    } catch (e) {
        console.warn('localStorage save failed:', e);
    }

    // 2. Try to POST to backend for server-side persistence (silent — no toast on failure)
    fetch(`${API_URL}/save_plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            kit_id: kitId,
            meal_plan: mealPlanData,
            custom_labels: window.customLabels || {},
            modified_at: new Date().toISOString(),
            saved_by: 'nutritionist_ui'
        })
    }).then(r => {
        if (r.ok) console.log('Plan synced to server ✓');
    }).catch(() => {
        // Silent — localStorage is the primary backup
        console.log('Server sync skipped (offline or endpoint not set up), saved to localStorage');
    });
}

/**
 * Restore the last saved plan from localStorage for a given Kit ID.
 * Called on page load to resume work without re-generating.
 */
function restoreFromLocalStorage(kitId) {
    try {
        const raw = localStorage.getItem(`${STORAGE_KEY}_${kitId}`);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

/**
 * Export the current in-memory plan as a timestamped JSON file.
 * This creates a portable audit record the nutritionist can save.
 */
function exportPlanAsJSON() {
    if (!mealPlanData) { showToast('⚠️ No meal plan to export.', 'error'); return; }
    const kitId = $('kitId').value.trim() || 'MealPlan';
    const snapshot = {
        kit_id: kitId,
        exported_at: new Date().toISOString(),
        exported_by: 'Nutritionist (NutriGenie UI)',
        patient_summary: patientProfile || {},
        meal_plan: mealPlanData,
        custom_labels: window.customLabels || {}
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${kitId}_MealPlan_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Plan exported as JSON!', 'success');
}