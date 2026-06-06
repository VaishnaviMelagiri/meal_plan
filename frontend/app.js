


/**
 * Personalized Meal Plan Generator by IOM Bioworks
 */

// ═══ Config ═══
const API_URL = 'https://slthfw3p52.execute-api.us-east-1.amazonaws.com/prod';

const NUTRITION_DB = {
    // Grains & Pulses
    'Oats':           { cal: 389, pro: 16.9, carb: 66.3, fat: 6.9,  fib: 10.6 },
    'Jowar':          { cal: 329, pro: 11.3, carb: 72.1, fat: 3.5,  fib: 6.3  },
    'Buckwheat':      { cal: 343, pro: 13.3, carb: 71.5, fat: 3.4,  fib: 10.0 },
    'Quinoa':         { cal: 368, pro: 14.1, carb: 64.2, fat: 6.1,  fib: 7.0  },
    'White rice':     { cal: 365, pro: 7.1,  carb: 80.4, fat: 0.7,  fib: 1.3  },
    'Corn':           { cal: 365, pro: 9.4,  carb: 74.3, fat: 4.7,  fib: 7.3  },
    'Tapioca':        { cal: 160, pro: 0.7,  carb: 38.1, fat: 0.3,  fib: 1.8  },
    'Cassava':        { cal: 160, pro: 1.4,  carb: 38.1, fat: 0.3,  fib: 1.8  },
    'Peas':           { cal: 81,  pro: 5.4,  carb: 14.5, fat: 0.4,  fib: 5.1  },
    'Moong':          { cal: 347, pro: 23.9, carb: 63.0, fat: 1.2,  fib: 16.3 },
    // Vegetables
    'Potato':         { cal: 77,  pro: 2.0,  carb: 17.5, fat: 0.1,  fib: 2.2  },
    'Cauliflower':    { cal: 25,  pro: 1.9,  carb: 5.0,  fat: 0.3,  fib: 2.0  },
    'Capsicum':       { cal: 27,  pro: 1.0,  carb: 6.3,  fat: 0.2,  fib: 2.1  },
    'Cucumber':       { cal: 15,  pro: 0.7,  carb: 3.6,  fat: 0.1,  fib: 0.5  },
    'Tomato':         { cal: 18,  pro: 0.9,  carb: 3.9,  fat: 0.2,  fib: 1.2  },
    'Carrot':         { cal: 41,  pro: 0.9,  carb: 9.6,  fat: 0.2,  fib: 2.8  },
    'Onion':          { cal: 40,  pro: 1.1,  carb: 9.3,  fat: 0.1,  fib: 1.7  },
    'Asparagus':      { cal: 20,  pro: 2.2,  carb: 3.9,  fat: 0.1,  fib: 2.1  },
    'Oyster mushroom':{ cal: 33,  pro: 3.3,  carb: 6.1,  fat: 0.4,  fib: 2.3  },
    'Sprout':         { cal: 30,  pro: 3.0,  carb: 5.9,  fat: 0.2,  fib: 1.8  },
    'Garlic':         { cal: 149, pro: 6.4,  carb: 33.1, fat: 0.5,  fib: 2.1  },
    // Fruits
    'Blueberry':      { cal: 57,  pro: 0.7,  carb: 14.5, fat: 0.3,  fib: 2.4  },
    'Cherry':         { cal: 63,  pro: 1.1,  carb: 16.0, fat: 0.2,  fib: 2.1  },
    'Kiwi':           { cal: 61,  pro: 1.1,  carb: 14.7, fat: 0.5,  fib: 3.0  },
    'Papaya':         { cal: 43,  pro: 0.5,  carb: 10.8, fat: 0.3,  fib: 1.7  },
    'Apple':          { cal: 52,  pro: 0.3,  carb: 13.8, fat: 0.2,  fib: 2.4  },
    'Pomegranate':    { cal: 83,  pro: 1.7,  carb: 18.7, fat: 1.2,  fib: 4.0  },
    'Raisins':        { cal: 299, pro: 3.1,  carb: 79.2, fat: 0.5,  fib: 3.7  },
    // Nuts & Seeds
    'Walnuts':        { cal: 654, pro: 15.2, carb: 13.7, fat: 65.2, fib: 6.7  },
    'Pistachios':     { cal: 562, pro: 20.2, carb: 27.5, fat: 45.3, fib: 10.3 },
    // Dairy & Substitutes
    'Ghee':           { cal: 900, pro: 0.0,  carb: 0.0,  fat: 99.8, fib: 0.0  },
    'Tofu':           { cal: 76,  pro: 8.1,  carb: 1.9,  fat: 4.8,  fib: 0.3  },
    'Soy drink':      { cal: 54,  pro: 3.3,  carb: 6.3,  fat: 1.8,  fib: 0.5  },
    'Coconut milk':   { cal: 230, pro: 2.3,  carb: 6.0,  fat: 23.8, fib: 2.2  },
    // Fish
    'Mackerel':       { cal: 205, pro: 18.6, carb: 0.0,  fat: 13.9, fib: 0.0  },
    'Sardine':        { cal: 208, pro: 24.6, carb: 0.0,  fat: 11.5, fib: 0.0  },
    'Herring':        { cal: 158, pro: 17.9, carb: 0.0,  fat: 9.0,  fib: 0.0  },
    'Trout':          { cal: 148, pro: 20.8, carb: 0.0,  fat: 6.6,  fib: 0.0  },
    // Spices
    'Curcumin':       { cal: 354, pro: 7.8,  carb: 64.9, fat: 9.9,  fib: 21.1 },
    // Others
    'Honey':          { cal: 304, pro: 0.3,  carb: 82.4, fat: 0.0,  fib: 0.2  },
    'Olive oil':      { cal: 884, pro: 0.0,  carb: 0.0,  fat: 100.0,fib: 0.0  },
    'Soybean oil':    { cal: 884, pro: 0.0,  carb: 0.0,  fat: 100.0,fib: 0.0  },
    'Whey protein':   { cal: 352, pro: 78.1, carb: 10.4, fat: 4.2,  fib: 0.0  },
    'Popcorn':        { cal: 387, pro: 12.9, carb: 77.9, fat: 4.5,  fib: 14.5 },
};

function calcNutrition(ingredients) {
    // ingredients is array of {name, quantity_g}
    let total = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
    ingredients.forEach(ing => {
        const qty = ing.quantity_g || 100;
        const scale = qty / 100;
        // Try exact match first, then case-insensitive partial match
        let n = NUTRITION_DB[ing.name];
        if (!n) {
            const key = Object.keys(NUTRITION_DB).find(k =>
                k.toLowerCase() === ing.name.toLowerCase() ||
                ing.name.toLowerCase().includes(k.toLowerCase()) ||
                k.toLowerCase().includes(ing.name.toLowerCase())
            );
            if (key) n = NUTRITION_DB[key];
        }
        if (n) {
            total.calories  += Math.round(n.cal  * scale);
            total.protein_g += Math.round(n.pro  * scale * 10) / 10;
            total.carbs_g   += Math.round(n.carb * scale * 10) / 10;
            total.fat_g     += Math.round(n.fat  * scale * 10) / 10;
            total.fiber_g   += Math.round(n.fib  * scale * 10) / 10;
        }
    });
    total.calories  = Math.round(total.calories);
    total.protein_g = Math.round(total.protein_g * 10) / 10;
    total.carbs_g   = Math.round(total.carbs_g   * 10) / 10;
    total.fat_g     = Math.round(total.fat_g     * 10) / 10;
    total.fiber_g   = Math.round(total.fiber_g   * 10) / 10;
    return total;
}

const $ = id => document.getElementById(id);

let currentDay = 'day_1';
let mealPlanData = null;
let patientProfile = null;


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
        window.macroTargets = result.macro_targets || null;
        window.calorieTarget = result.calorie_target || null;
        currentDay = 'day_1';
        renderMealPlan(result);

        setStatus('online', 'Ready');
        showToast('✅ Meal plan generated!', 'success', 3000);

    } catch (err) {
        console.error(err);
        showToast(`❌ ${err.message}`, 'error', 6000);
        setStatus('error', 'Error');
    } finally {
        setLoading(false);
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
        { label: 'Product', value: profile.product_type || 'GutHeal' },
        { label: 'Diet', value: profile.diet_type || 'Veg' },
        { label: 'BMI', value: profile.bmi || 'N/A' },
        { label: profile.product_type === 'SEnS' ? 'Focus' : 'IBS Type',
          value: profile.product_type === 'SEnS' ? 'Sleep · Energy · Stress' : ((profile.ibs_info && profile.ibs_info.subtype) || 'N/A') },
        { label: profile.product_type === 'SEnS' ? 'Challenges' : 'Severity',
          value: profile.product_type === 'SEnS' ? 'Better Sleep, Higher Energy, Lower Stress' : ((profile.ibs_info && profile.ibs_info.severity_level) || 'N/A') },
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

    if (profile.avoid_foods && profile.avoid_foods.length) {
        const allFoods = profile.avoid_foods;
        const shown = allFoods.slice(0, 20);
        const extra = allFoods.length - 20;
        const allTags = allFoods.map(a => `<span class="avoid-tag red">${esc(a)}</span>`).join('');
        const shownTags = shown.map(a => `<span class="avoid-tag red">${esc(a)}</span>`).join('');
        const moreId = 'avoidFoodsExpanded';
        html += `<div class="profile-card" style="grid-column: span 4">
            <div class="profile-card-label">🔬 Foods to Avoid — Microbiome Report (${allFoods.length} items)</div>
            <div class="profile-card-value" style="font-size:0.7rem" id="avoidFoodsShort">
                ${shownTags}
                ${extra > 0 ? `<span style="color:var(--accent);cursor:pointer;text-decoration:underline;margin-left:4px"
                    onclick="document.getElementById('avoidFoodsShort').style.display='none';document.getElementById('${moreId}').style.display='block'">
                    +${extra} more ▼</span>` : ''}
            </div>
            <div class="profile-card-value" style="font-size:0.7rem;display:none" id="${moreId}">
                ${allTags}
                <span style="color:var(--accent);cursor:pointer;text-decoration:underline;margin-left:4px"
                    onclick="document.getElementById('${moreId}').style.display='none';document.getElementById('avoidFoodsShort').style.display='block'">
                    ▲ Show less</span>
            </div>
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
    $('dayTabs').style.display = 'none';
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
        const showZeroNote = m.total_calories === 0 && m.nutrition_source === 'fallback';
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
                ${showZeroNote ? `
                <div style="font-size:0.75rem;color:var(--text-muted);padding:8px 0;font-style:italic">
                    Nutrition calculated when plan is regenerated
                </div>` : `
                <div class="macro-grid">
                    <div class="macro-box"><span class="macro-val">${pro}g</span><span class="macro-lbl">Protein</span></div>
                    <div class="macro-box"><span class="macro-val">${carb}g</span><span class="macro-lbl">Carbs</span></div>
                    <div class="macro-box"><span class="macro-val">${fat}g</span><span class="macro-lbl">Fat</span></div>
                    <div class="macro-box"><span class="macro-val">${fib}g</span><span class="macro-lbl">Fiber</span></div>
                </div>`}
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
    const calTarget = (window.calorieTarget) || NIN_RDA.cal;
    const proTarget = (window.macroTargets && window.macroTargets.protein_g) || NIN_RDA.pro;
    const carbTarget = (window.macroTargets && window.macroTargets.carbs_g) || NIN_RDA.carb;
    const fatTarget = (window.macroTargets && window.macroTargets.fat_g) || NIN_RDA.fat;
    const fibTarget = (window.macroTargets && window.macroTargets.fiber_g) || NIN_RDA.fib;
    const summary = $('dailySummary');
    summary.classList.remove('hidden');
    summary.innerHTML = `
        <div class="summary-title">📊 Daily Totals
            <span style="font-size:0.72rem;font-weight:400;color:var(--text-muted);margin-left:10px">
                Target: ${calTarget} kcal • ${NIN_RDA.label} for reference
            </span>
        </div>
        <div class="bar-grid">
            ${makeBar('Calories', totals.cal, calTarget, 'kcal', 'cal')}
            ${makeBar('Protein', totals.pro, proTarget, 'g', 'pro')}
            ${makeBar('Carbs', totals.carb, carbTarget, 'g', 'carb')}
            ${makeBar('Fat', totals.fat, fatTarget, 'g', 'fat')}
            ${makeBar('Fiber', totals.fib, fibTarget, 'g', 'fib')}
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
        doc.text('NutriGenie  -  Personalized Meal Plan', LM, 13);
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
        doc.text('Page 1 of 2  |  NutriGenie by IOM Bioworks', PW/2, PH-6, {align:'center'});

        // ── PAGES 2-8: One page per day ──────────────────────
        for (let d = 1; d <= 7; d++) {
            const day = mealPlanData['day_'+d];
            if (!day) continue;
            newPage();

            // Day header bar
            doc.setFillColor(49, 46, 129);
            doc.rect(0, 0, PW, 20, 'F');
            setTxt(14, ACCENT, true);
            doc.text('Your Personalized Meal Plan', LM, 13);
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
            doc.text('Page 2 of 2  |  NutriGenie by IOM Bioworks', PW/2, PH-6, {align:'center'});
        }

        doc.save(kitId+'_Meal_Plan.pdf');
        showToast('✅ PDF Downloaded!', 'success');

    } catch(err) {
        console.error('PDF error:', err);
        showToast('❌ PDF failed: '+err.message, 'error', 8000);
    }
}


// ═══ Yes-List Food Chooser (fully dynamic — built per meal slot from patient's yes_by_group) ═══
function openYesListChooser(day, mealType) {
    if (!patientProfile || !patientProfile.yes_by_group) {
        showToast('No approved food list available.', 'warning'); return;
    }
    const bg = patientProfile.yes_by_group;
    const grains  = bg['Grains & Pulses'] || [];
    const vegs    = bg['Vegetables'] || [];
    const fruits  = bg['Fruits'] || [];
    const nuts    = bg['Dry Fruits and Nuts'] || [];
    const dairy   = bg['Dairy and Substitutes'] || [];
    const fish    = bg['Meat, Fish & Poultry'] || [];
    const spices  = bg['Spices'] || [];
    const bev     = bg['Beverages'] || [];
    const others  = bg['Others'] || [];
    const seeds   = bg['Seeds'] || [];
    const sp  = spices[0] || '';
    const sp2 = spices[1] || sp;
    const ghee = dairy.includes('Ghee') ? 'Ghee' : (dairy[0] || '');
    const suggestions = [];

    // BREAKFAST — light, grain + fruit/dairy based
    if (mealType === 'breakfast') {
        grains.forEach((g, i) => {
            const v = vegs[i % vegs.length] || '';
            suggestions.push({ name: `${g} Porridge${sp ? ' with ' + sp : ''}`, ings: [g, sp, ghee].filter(Boolean) });
            suggestions.push({ name: `${g} Upma${v ? ' with ' + v : ''}`, ings: [g, v, sp].filter(Boolean) });
            if (i < 3) suggestions.push({ name: `${g} Dosa${sp ? ' with ' + sp : ''}`, ings: [g, sp].filter(Boolean) });
        });
        fruits.slice(0, 4).forEach(f => {
            suggestions.push({ name: `${f} Smoothie${dairy[0] ? ' with ' + dairy[0] : ''}`, ings: [f, dairy[0]].filter(Boolean) });
        });
        if (bev.length) bev.slice(0, 2).forEach(b => suggestions.push({ name: b, ings: [b] }));
    }

    // MID MORNING SNACK — small, fruit + nut based
    if (mealType === 'mid_morning_snack') {
        fruits.forEach(f => {
            if (nuts[0]) suggestions.push({ name: `${f} with ${nuts[0]}`, ings: [f, nuts[0]] });
            else suggestions.push({ name: `Fresh ${f}`, ings: [f] });
        });
        nuts.forEach(n => {
            if (fruits[0]) suggestions.push({ name: `${fruits[0]} and ${n} Bowl`, ings: [fruits[0], n] });
        });
        if (bev.length) bev.forEach(b => suggestions.push({ name: b, ings: [b] }));
        grains.slice(0, 2).forEach(g => suggestions.push({ name: `${g} Porridge`, ings: [g] }));
        seeds.forEach(s => suggestions.push({ name: `${s} with ${fruits[0] || grains[0]}`, ings: [s, fruits[0] || grains[0]].filter(Boolean) }));
    }

    // LUNCH — heaviest meal, grain + multiple veg + protein
    if (mealType === 'lunch') {
        grains.forEach((g, i) => {
            const v1 = vegs[i % vegs.length] || '';
            const v2 = vegs[(i + 1) % vegs.length] || '';
            const v3 = vegs[(i + 2) % vegs.length] || '';
            if (v1 && v2) suggestions.push({ name: `${g} with ${v1} and ${v2} Sabzi${ghee ? ' and ' + ghee : ''}`, ings: [g, v1, v2, ghee, sp].filter(Boolean) });
            suggestions.push({ name: `${g} Khichdi with ${v1}${ghee ? ' and ' + ghee : ''}`, ings: [g, v1, v3, ghee].filter(Boolean) });
            if (i < 2) suggestions.push({ name: `${g} Pulao with ${v1} and ${v2}`, ings: [g, v1, v2, sp].filter(Boolean) });
        });
        fish.forEach((f, i) => {
            const v = vegs[i % vegs.length] || '';
            suggestions.push({ name: `${f} Curry${v ? ' with ' + v : ''}${sp ? ' and ' + sp : ''}`, ings: [f, v, sp, ghee].filter(Boolean) });
            suggestions.push({ name: `${f} with ${grains[0] || ''} Rice`, ings: [f, grains[0], sp].filter(Boolean) });
        });
        vegs.slice(0, 4).forEach((v, i) => {
            const v2 = vegs[(i + 2) % vegs.length] || '';
            if (v !== v2 && v2) suggestions.push({ name: `${v} and ${v2} Sabzi with ${grains[0] || ''}`, ings: [v, v2, grains[0], sp].filter(Boolean) });
        });
    }

    // EVENING SNACK — light protein or fruit
    if (mealType === 'evening_snack') {
        fish.forEach(f => {
            suggestions.push({ name: `${f} Tikka${sp ? ' with ' + sp : ''}`, ings: [f, sp, sp2].filter(Boolean) });
            suggestions.push({ name: `${f} preparation${sp ? ' with ' + sp : ''}`, ings: [f, sp].filter(Boolean) });
        });
        fruits.forEach(f => {
            if (nuts[0]) suggestions.push({ name: `${f} with ${nuts[0]}`, ings: [f, nuts[0]] });
            suggestions.push({ name: `Fresh ${f} Bowl`, ings: [f] });
        });
        nuts.forEach(n => suggestions.push({ name: `${n} Mix`, ings: [n] }));
        if (bev.length) bev.slice(0, 3).forEach(b => suggestions.push({ name: b, ings: [b] }));
        grains.slice(0, 2).forEach(g => suggestions.push({ name: `${g} Chaat${sp ? ' with ' + sp : ''}`, ings: [g, vegs[0], sp].filter(Boolean) }));
    }

    // DINNER — light, easy to digest
    if (mealType === 'dinner') {
        grains.forEach((g, i) => {
            const v1 = vegs[i % vegs.length] || '';
            const v2 = vegs[(i + 1) % vegs.length] || '';
            suggestions.push({ name: `${g} Khichdi with ${v1}${ghee ? ' and ' + ghee : ''}`, ings: [g, v1, ghee, sp].filter(Boolean) });
            if (v1 && v2) suggestions.push({ name: `${g} Soup with ${v1} and ${v2}`, ings: [g, v1, v2, sp].filter(Boolean) });
            suggestions.push({ name: `${g} Congee with ${v1}`, ings: [g, v1, sp].filter(Boolean) });
        });
        vegs.slice(0, 3).forEach((v, i) => {
            const v2 = vegs[(i + 2) % vegs.length] || '';
            if (v !== v2) suggestions.push({ name: `Light ${v} and ${v2} Sabzi`, ings: [v, v2, sp].filter(Boolean) });
        });
        fish.slice(0, 2).forEach(f => {
            suggestions.push({ name: `${f} Soup${sp ? ' with ' + sp : ''}`, ings: [f, vegs[0], sp].filter(Boolean) });
        });
    }

    // Deduplicate by name
    const seen = new Set();
    const unique = suggestions.filter(s => {
        if (!s.name || seen.has(s.name)) return false;
        seen.add(s.name); return true;
    });

    // Shuffle for variety each time
    unique.sort(() => Math.random() - 0.5);

    if (!unique.length) { showToast('No suggestions for this meal type.', 'info'); return; }

    window._yesListSuggestions = unique;
    const mealLabels = { breakfast: 'Breakfast', mid_morning_snack: 'Morning Snack', lunch: 'Lunch', evening_snack: 'Evening Snack', dinner: 'Dinner' };
    const label = mealLabels[mealType] || mealType;

    let html = `
        <h3 style="margin:0 0 4px;color:var(--text-primary)">🥗 Choose for ${esc(label)}</h3>
        <p style="font-size:0.75rem;color:var(--text-muted);margin:0 0 12px">
            ${unique.length} options from your IOM-approved foods. Regenerate for accurate nutrition.
        </p>`;
    unique.forEach((dish, i) => {
        html += `
        <div onclick="selectYesListDish('${day}','${mealType}',${i})"
            style="border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer;transition:border-color 0.2s"
            onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
            <div style="font-weight:600;color:var(--text-primary)">${esc(dish.name)}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">
                ${dish.ings.map(esc).join(' • ')}
            </div>
            <div style="font-size:0.72rem;color:var(--accent);margin-top:4px">✓ All ingredients from your approved list</div>
        </div>`;
    });

    const modal = $('yesListModal');
    if (!modal) { showToast('Modal not found', 'error'); return; }
    const body = modal.querySelector('.modal-body');
    if (body) body.innerHTML = html;
    modal.classList.remove('hidden');
    window._addMealDay = day;
    window._addMealType = mealType;
}

function closeYesListChooser() {
    $('yesListModal').classList.add('hidden');
}

function selectYesListDish(day, mealType, index) {
    const dish = window._yesListSuggestions[index];
    if (!dish || !mealPlanData || !mealPlanData[day]) return;
    const ingredients = dish.ings.map(name => ({ name, quantity_g: 100 }));
    const nutrition = calcNutrition(ingredients);
    mealPlanData[day][mealType] = {
        name: dish.name,
        serving_size: '1 serving',
        accompaniments: [],
        ingredients,
        total_calories: nutrition.calories,
        protein_g: nutrition.protein_g,
        carbs_g: nutrition.carbs_g,
        fat_g: nutrition.fat_g,
        fiber_g: nutrition.fiber_g,
        prep_time_min: 15,
        benefits: 'From your IOM-approved food list.',
        nutrition_source: 'usda_calculated'
    };
    const modal = $('yesListModal');
    if (modal) modal.classList.add('hidden');
    renderDay(day);
    showToast(`✅ ${esc(dish.name)} added!`, 'success', 3000);
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