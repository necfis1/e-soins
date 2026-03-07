import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
```

**4.** Cliquez **"Commit changes"**

---

## Étape 4 — Déplacer `App.js` dans `src/`

**1.** Cliquez sur le fichier **`App.js`** qui est déjà sur GitHub

**2.** Cliquez sur ✏️ le crayon pour éditer

**3.** Changez le nom en haut de `App.js` vers :
```
src/App.js
