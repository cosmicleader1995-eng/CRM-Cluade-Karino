-- ====================================================================
-- اسکریپت مهاجرت امن داده‌ها از فرمت تک‌ردیف JSONB به جداول رابطه‌ای
-- Migration Script: karino_store (JSONB Blob) -> Relational Supabase Tables
-- ====================================================================

DO $$
DECLARE
    store_record RECORD;
    v_data JSONB;
    u JSONB;
    r JSONB;
    row_item JSONB;
    p JSONB;
    a JSONB;
    c TEXT;
    d JSONB;
BEGIN
    -- ۱. بررسی وجود جدول قدیمی karino_store
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'karino_store'
    ) THEN
        SELECT data INTO v_data FROM public.karino_store WHERE id = 'main_state';

        IF v_data IS NOT NULL THEN
            RAISE NOTICE 'در حال انتقال داده‌ها از karino_store...';

            -- ۱.۱. انتقال کاربران (users)
            IF v_data ? 'users' AND jsonb_typeof(v_data->'users') = 'array' THEN
                FOR u IN SELECT * FROM jsonb_array_elements(v_data->'users')
                LOOP
                    INSERT INTO public.users (
                        id, username, full_name, consultant_code, role, password_hash, phone, branch
                    ) VALUES (
                        u->>'id',
                        LOWER(u->>'username'),
                        u->>'fullName',
                        UPPER(u->>'consultantCode'),
                        COALESCE(u->>'role', 'consultant'),
                        COALESCE(u->>'passwordHash', crypt(COALESCE(u->>'password', '1234'), gen_salt('bf'))),
                        u->>'phone',
                        COALESCE(u->>'branch', 'دفتر مرکزی کارینو')
                    ) ON CONFLICT (id) DO UPDATE SET
                        full_name = EXCLUDED.full_name,
                        consultant_code = EXCLUDED.consultant_code,
                        role = EXCLUDED.role,
                        phone = EXCLUDED.phone,
                        branch = EXCLUDED.branch;
                END LOOP;
            END IF;

            -- ۱.۲. انتقال گزارش‌های روزانه و ردیف‌های متناظر (daily_reports & report_rows)
            IF v_data ? 'reports' AND jsonb_typeof(v_data->'reports') = 'array' THEN
                FOR r IN SELECT * FROM jsonb_array_elements(v_data->'reports')
                LOOP
                    INSERT INTO public.daily_reports (
                        id, consultant_id, consultant_name, consultant_code, branch,
                        date_shamsi, day_of_week_shamsi, submitted_at, guild,
                        personal_opinion, manager_feedback, manager_rating, status,
                        reviewed_at, created_at, updated_at
                    ) VALUES (
                        r->>'id',
                        r->>'consultantId',
                        COALESCE(r->>'consultantName', 'مشاور کارینو'),
                        COALESCE(r->>'consultantCode', 'C-100'),
                        r->>'branch',
                        COALESCE(r->>'dateShamsi', '۱۴۰۴/۰۶/۱۹'),
                        COALESCE(r->>'dayOfWeekShamsi', 'پنج‌شنبه'),
                        COALESCE(r->>'submittedAt', '18:30'),
                        COALESCE(r->>'guild', 'اصناف و بنگاه‌های اقتصادی'),
                        r->>'personalOpinion',
                        r->>'managerFeedback',
                        CASE WHEN (r->>'managerRating') IS NOT NULL AND (r->>'managerRating') <> '' 
                             THEN (r->>'managerRating')::NUMERIC 
                             ELSE NULL END,
                        COALESCE(r->>'status', 'submitted'),
                        CASE WHEN (r->>'reviewedAt') IS NOT NULL AND (r->>'reviewedAt') <> '' 
                             THEN (r->>'reviewedAt')::TIMESTAMPTZ 
                             ELSE NULL END,
                        COALESCE((r->>'createdAt')::TIMESTAMPTZ, NOW()),
                        COALESCE((r->>'updatedAt')::TIMESTAMPTZ, NOW())
                    ) ON CONFLICT (id) DO UPDATE SET
                        manager_feedback = EXCLUDED.manager_feedback,
                        manager_rating = EXCLUDED.manager_rating,
                        status = EXCLUDED.status,
                        reviewed_at = EXCLUDED.reviewed_at,
                        updated_at = EXCLUDED.updated_at;

                    -- انتقال ردیف‌های گزارش
                    IF r ? 'rows' AND jsonb_typeof(r->'rows') = 'array' THEN
                        FOR row_item IN SELECT * FROM jsonb_array_elements(r->'rows')
                        LOOP
                            INSERT INTO public.report_rows (
                                id, report_id, row_number, client_name, activity_field,
                                personnel_count, phone, address, employer_concern,
                                follow_up_1, follow_up_1_date, follow_up_1_date_shamsi,
                                follow_up_2, follow_up_2_date, follow_up_2_date_shamsi,
                                follow_up_3, follow_up_3_date, follow_up_3_date_shamsi,
                                follow_up_4, follow_up_4_date, follow_up_4_date_shamsi,
                                follow_up_result, meeting_topic, notes,
                                created_at, updated_at
                            ) VALUES (
                                COALESCE(row_item->>'id', 'row-' || (r->>'id') || '-' || (row_item->>'rowNumber')),
                                r->>'id',
                                COALESCE((row_item->>'rowNumber')::INTEGER, 1),
                                COALESCE(row_item->>'clientName', 'کارفرمای محترم'),
                                COALESCE(row_item->>'activityField', 'خدمات'),
                                row_item->>'personnelCount',
                                COALESCE(row_item->>'phone', '09150000000'),
                                COALESCE(row_item->>'address', 'مشهد'),
                                COALESCE(row_item->>'employerConcern', 'عمومی'),
                                COALESCE(row_item->>'followUp1', '+'),
                                CASE WHEN (row_item->>'followUp1Date') IS NOT NULL AND (row_item->>'followUp1Date') <> '' THEN (row_item->>'followUp1Date')::TIMESTAMPTZ ELSE NULL END,
                                row_item->>'followUp1DateShamsi',
                                row_item->>'followUp2',
                                CASE WHEN (row_item->>'followUp2Date') IS NOT NULL AND (row_item->>'followUp2Date') <> '' THEN (row_item->>'followUp2Date')::TIMESTAMPTZ ELSE NULL END,
                                row_item->>'followUp2DateShamsi',
                                row_item->>'followUp3',
                                CASE WHEN (row_item->>'followUp3Date') IS NOT NULL AND (row_item->>'followUp3Date') <> '' THEN (row_item->>'followUp3Date')::TIMESTAMPTZ ELSE NULL END,
                                row_item->>'followUp3DateShamsi',
                                row_item->>'followUp4',
                                CASE WHEN (row_item->>'followUp4Date') IS NOT NULL AND (row_item->>'followUp4Date') <> '' THEN (row_item->>'followUp4Date')::TIMESTAMPTZ ELSE NULL END,
                                row_item->>'followUp4DateShamsi',
                                COALESCE(row_item->>'followUpResult', 'مکالمه انجام شد'),
                                row_item->>'meetingTopic',
                                row_item->>'notes',
                                NOW(),
                                NOW()
                            ) ON CONFLICT (id) DO UPDATE SET
                                follow_up_2 = EXCLUDED.follow_up_2,
                                follow_up_2_date = EXCLUDED.follow_up_2_date,
                                follow_up_2_date_shamsi = EXCLUDED.follow_up_2_date_shamsi,
                                follow_up_3 = EXCLUDED.follow_up_3,
                                follow_up_3_date = EXCLUDED.follow_up_3_date,
                                follow_up_3_date_shamsi = EXCLUDED.follow_up_3_date_shamsi,
                                follow_up_4 = EXCLUDED.follow_up_4,
                                follow_up_4_date = EXCLUDED.follow_up_4_date,
                                follow_up_4_date_shamsi = EXCLUDED.follow_up_4_date_shamsi,
                                follow_up_result = EXCLUDED.follow_up_result,
                                updated_at = NOW();
                        END LOOP;
                    END IF;
                END LOOP;
            END IF;

            -- ۱.۳. انتقال گزارش‌های تحلیلی ادواری (periodic_reports)
            IF v_data ? 'overallReports' AND jsonb_typeof(v_data->'overallReports') = 'array' THEN
                FOR p IN SELECT * FROM jsonb_array_elements(v_data->'overallReports')
                LOOP
                    INSERT INTO public.periodic_reports (
                        id, consultant_id, consultant_name, consultant_code,
                        period_type, date_shamsi, day_of_week_shamsi, submitted_at,
                        period_label, summary, key_achievements, challenges_or_barriers,
                        plans_or_priorities, self_rating, manager_feedback, manager_status,
                        reviewed_at, created_at, updated_at
                    ) VALUES (
                        p->>'id',
                        p->>'consultantId',
                        COALESCE(p->>'consultantName', 'مشاور کارینو'),
                        COALESCE(p->>'consultantCode', 'C-100'),
                        COALESCE(p->>'periodType', 'weekly'),
                        COALESCE(p->>'dateShamsi', '۱۴۰۴/۰۶/۱۹'),
                        COALESCE(p->>'dayOfWeekShamsi', 'پنج‌شنبه'),
                        COALESCE(p->>'submittedAt', '18:40'),
                        COALESCE(p->>'periodLabel', 'گزارش عملکرد'),
                        COALESCE(p->>'summary', 'خلاصه عملکرد دوره'),
                        p->>'keyAchievements',
                        p->>'challengesOrBarriers',
                        p->>'plansOrPriorities',
                        CASE WHEN (p->>'selfRating') IS NOT NULL AND (p->>'selfRating') <> '' THEN (p->>'selfRating')::NUMERIC ELSE NULL END,
                        p->>'managerFeedback',
                        COALESCE(p->>'managerStatus', 'pending'),
                        CASE WHEN (p->>'reviewedAt') IS NOT NULL AND (p->>'reviewedAt') <> '' THEN (p->>'reviewedAt')::TIMESTAMPTZ ELSE NULL END,
                        COALESCE((p->>'createdAt')::TIMESTAMPTZ, NOW()),
                        COALESCE((p->>'updatedAt')::TIMESTAMPTZ, NOW())
                    ) ON CONFLICT (id) DO UPDATE SET
                        manager_feedback = EXCLUDED.manager_feedback,
                        manager_status = EXCLUDED.manager_status,
                        reviewed_at = EXCLUDED.reviewed_at,
                        updated_at = EXCLUDED.updated_at;
                END LOOP;
            END IF;

            -- ۱.۴. انتقال سرفصل‌های دغدغه‌ها (employer_concerns)
            IF v_data ? 'concerns' AND jsonb_typeof(v_data->'concerns') = 'array' THEN
                FOR c IN SELECT jsonb_array_elements_text(v_data->'concerns')
                LOOP
                    INSERT INTO public.employer_concerns (title)
                    VALUES (c)
                    ON CONFLICT (title) DO NOTHING;
                END LOOP;
            END IF;

            -- ۱.۵. انتقال دستورات مدیریتی (directives)
            IF v_data ? 'directives' AND jsonb_typeof(v_data->'directives') = 'array' THEN
                FOR d IN SELECT * FROM jsonb_array_elements(v_data->'directives')
                LOOP
                    INSERT INTO public.directives (
                        id, author_id, author_name, target_consultant_id, content, priority, date_shamsi, created_at
                    ) VALUES (
                        d->>'id',
                        COALESCE(d->>'authorId', 'user-ceo'),
                        COALESCE(d->>'authorName', 'مدیریت کارینو'),
                        COALESCE(d->>'targetConsultantId', 'all'),
                        COALESCE(d->>'content', ''),
                        COALESCE(d->>'priority', 'normal'),
                        COALESCE(d->>'dateShamsi', '۱۴۰۴/۰۶/۱۹'),
                        COALESCE((d->>'createdAt')::TIMESTAMPTZ, NOW())
                    ) ON CONFLICT (id) DO UPDATE SET
                        content = EXCLUDED.content,
                        priority = EXCLUDED.priority;
                END LOOP;
            END IF;

            -- ۱.۶. انتقال بایگانی‌ها (archives)
            IF v_data ? 'archives' AND jsonb_typeof(v_data->'archives') = 'array' THEN
                FOR a IN SELECT * FROM jsonb_array_elements(v_data->'archives')
                LOOP
                    INSERT INTO public.archives (
                        id, file_name, date_shamsi, day_of_week, timestamp,
                        archive_type, period_title, total_consultants, total_clients_contacted,
                        top_concerns, reports_snapshot, overall_reports_snapshot, auto_generated, created_at
                    ) VALUES (
                        a->>'id',
                        COALESCE(a->>'fileName', 'Archive.xlsx'),
                        COALESCE(a->>'dateShamsi', '۱۴۰۴/۰۶/۱۹'),
                        COALESCE(a->>'dayOfWeek', 'پنج‌شنبه'),
                        COALESCE((a->>'timestamp')::TIMESTAMPTZ, NOW()),
                        COALESCE(a->>'archiveType', 'calls_daily'),
                        a->>'periodTitle',
                        COALESCE((a->>'totalConsultants')::INTEGER, 0),
                        COALESCE((a->>'totalClientsContacted')::INTEGER, 0),
                        COALESCE(a->'topConcerns', '[]'::jsonb),
                        COALESCE(a->'reports', '[]'::jsonb),
                        COALESCE(a->'overallReports', '[]'::jsonb),
                        COALESCE((a->>'autoGenerated')::BOOLEAN, false),
                        NOW()
                    ) ON CONFLICT (id) DO NOTHING;
                END LOOP;
            END IF;

            RAISE NOTICE 'مهاجرت با موفقیت به پایان رسید.';
        END IF;
    END IF;
END $$;
