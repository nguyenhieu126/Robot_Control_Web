/**
 * models/robotStateModel.js
 * Model quản lý trạng thái robot (mode persistence)
 */

const db = require('../config/db');

class RobotStateModel {
    /**
     * Lấy mode hiện tại từ database
     * @returns {Promise<{mode: string, updated_at: Date}>}
     */
    static async getCurrentMode() {
        const query = `
            SELECT mode, updated_at, note 
            FROM robot_state 
            ORDER BY id DESC 
            LIMIT 1
        `;
        const result = await db.query(query);
        
        // Nếu chưa có record nào, tạo mặc định
        if (result.rows.length === 0) {
            await this.setMode('AUTONOMOUS', null, 'Auto-created default');
            return { mode: 'AUTONOMOUS', updated_at: new Date(), note: 'Auto-created default' };
        }
        
        return result.rows[0];
    }

    /**
     * Cập nhật mode (singleton - chỉ 1 row)
     * @param {string} mode - 'AUTONOMOUS' hoặc 'MANUAL'
     * @param {number|null} userId - User ID người thay đổi
     * @param {string|null} note - Ghi chú
     * @returns {Promise<{mode: string, updated_at: Date}>}
     */
    static async setMode(mode, userId = null, note = null) {
        // Validate mode
        if (!['AUTONOMOUS', 'MANUAL'].includes(mode)) {
            throw new Error(`Invalid mode: ${mode}. Must be AUTONOMOUS or MANUAL.`);
        }

        // Upsert: update nếu có, insert nếu không
        const query = `
            INSERT INTO robot_state (id, mode, updated_by, note, updated_at)
            VALUES (1, $1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (id) 
            DO UPDATE SET 
                mode = EXCLUDED.mode,
                updated_by = EXCLUDED.updated_by,
                note = EXCLUDED.note,
                updated_at = CURRENT_TIMESTAMP
            RETURNING mode, updated_at, note
        `;
        
        const result = await db.query(query, [mode, userId, note]);
        return result.rows[0];
    }

    /**
     * Lấy lịch sử thay đổi mode (nếu có log riêng - tùy chọn)
     * Hiện tại chỉ có 1 row nên không có history
     */
    static async getHistory(limit = 20) {
        // Có thể mở rộng bằng cách thêm bảng robot_state_history
        // Hiện tại return mode hiện tại
        const current = await this.getCurrentMode();
        return [current];
    }
}

module.exports = RobotStateModel;
